/**
 * Input mapping tests.
 *
 * Only the pure mapping layer is covered — `createInput()` needs a DOM and is
 * verified by hand. The gamepad *mapping* is tested against fake Gamepad-like
 * objects; that proves the button/axis decisions, not that real hardware
 * enumerates the way the spec says it does.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  KEY_BINDINGS,
  GAMEPAD_BUTTON_BINDINGS,
  actionForCode,
  computeState,
  emptyState,
  readGamepad,
  readKeyboard,
} from '../src/core/input.js';
import { GAMEPAD_STICK_DEADZONE } from '../src/config/tuning.js';

/**
 * Build a fake Gamepad snapshot.
 * @param {{ buttons?: number[], axes?: number[] }} spec - Pressed button
 *   indices and axis values.
 * @returns {{ buttons: Array<{pressed: boolean}>, axes: number[] }} Fake pad.
 */
function fakePad(spec = {}) {
  const pressed = new Set(spec.buttons ?? []);
  const buttons = [];
  for (let i = 0; i < 16; i += 1) buttons.push({ pressed: pressed.has(i) });
  return { buttons, axes: spec.axes ?? [0, 0, 0, 0] };
}

test('key bindings', async (t) => {
  await t.test('arrows and WASD map to the same four directions', () => {
    assert.equal(actionForCode('ArrowUp'), actionForCode('KeyW'));
    assert.equal(actionForCode('ArrowDown'), actionForCode('KeyS'));
    assert.equal(actionForCode('ArrowLeft'), actionForCode('KeyA'));
    assert.equal(actionForCode('ArrowRight'), actionForCode('KeyD'));
  });

  await t.test('Space is the jump key', () => {
    assert.equal(actionForCode('Space'), 'jump');
  });

  await t.test('unbound keys map to null', () => {
    assert.equal(actionForCode('KeyQ'), null);
    assert.equal(actionForCode('Backquote'), null, 'the debug toggle must not be a game action');
  });

  await t.test('every binding targets a known action', () => {
    const actions = new Set(Object.keys(emptyState()));
    for (const action of Object.values(KEY_BINDINGS)) {
      assert.ok(actions.has(action), `unknown action ${action}`);
    }
    for (const action of Object.values(GAMEPAD_BUTTON_BINDINGS)) {
      assert.ok(actions.has(action), `unknown action ${action}`);
    }
  });
});

test('readKeyboard: simultaneous keys', async (t) => {
  await t.test('accelerate + steer register together', () => {
    const state = readKeyboard(new Set(['ArrowUp', 'ArrowLeft']));
    assert.equal(state.up, true);
    assert.equal(state.left, true);
    assert.equal(state.down, false);
    assert.equal(state.right, false);
  });

  await t.test('accelerate + steer + jump register together', () => {
    const state = readKeyboard(new Set(['KeyW', 'KeyD', 'Space']));
    assert.deepEqual(state, { up: true, down: false, left: false, right: true, jump: true });
  });

  await t.test('mixed arrow and WASD keys combine', () => {
    const state = readKeyboard(new Set(['ArrowUp', 'KeyD']));
    assert.equal(state.up, true);
    assert.equal(state.right, true);
  });

  await t.test('the same direction from two keys is not double-counted or cancelled', () => {
    const state = readKeyboard(new Set(['ArrowUp', 'KeyW']));
    assert.equal(state.up, true);
  });

  await t.test('opposing keys both register — resolution is the caller\'s decision', () => {
    const state = readKeyboard(new Set(['ArrowLeft', 'ArrowRight']));
    assert.equal(state.left, true);
    assert.equal(state.right, true);
  });

  await t.test('unbound keys are ignored', () => {
    const state = readKeyboard(new Set(['KeyQ', 'F5', 'ArrowUp']));
    assert.deepEqual(state, { up: true, down: false, left: false, right: false, jump: false });
  });

  await t.test('no keys held yields an all-false state', () => {
    assert.deepEqual(readKeyboard(new Set()), {
      up: false, down: false, left: false, right: false, jump: false,
    });
  });
});

test('readGamepad', async (t) => {
  await t.test('a missing pad yields an all-false state', () => {
    assert.deepEqual(readGamepad(null), {
      up: false, down: false, left: false, right: false, jump: false,
    });
  });

  await t.test('d-pad buttons map to directions', () => {
    assert.equal(readGamepad(fakePad({ buttons: [12] })).up, true);
    assert.equal(readGamepad(fakePad({ buttons: [13] })).down, true);
    assert.equal(readGamepad(fakePad({ buttons: [14] })).left, true);
    assert.equal(readGamepad(fakePad({ buttons: [15] })).right, true);
  });

  await t.test('the bottom face button jumps', () => {
    assert.equal(readGamepad(fakePad({ buttons: [0] })).jump, true);
    assert.equal(readGamepad(fakePad({ buttons: [1] })).jump, false);
  });

  await t.test('d-pad diagonals register both directions', () => {
    const state = readGamepad(fakePad({ buttons: [12, 14] }));
    assert.equal(state.up, true);
    assert.equal(state.left, true);
  });

  await t.test('stick movement inside the deadzone reads as centred', () => {
    const inside = GAMEPAD_STICK_DEADZONE * 0.9;
    const state = readGamepad(fakePad({ axes: [inside, -inside] }));
    assert.deepEqual(state, { up: false, down: false, left: false, right: false, jump: false });
  });

  await t.test('stick movement beyond the deadzone digitises to a direction', () => {
    const outside = Math.min(1, GAMEPAD_STICK_DEADZONE + 0.2);
    assert.equal(readGamepad(fakePad({ axes: [-outside, 0] })).left, true);
    assert.equal(readGamepad(fakePad({ axes: [outside, 0] })).right, true);
    assert.equal(readGamepad(fakePad({ axes: [0, -outside] })).up, true, 'axis Y is positive-down');
    assert.equal(readGamepad(fakePad({ axes: [0, outside] })).down, true);
  });

  await t.test('the stick digitises to diagonals', () => {
    const outside = Math.min(1, GAMEPAD_STICK_DEADZONE + 0.2);
    const state = readGamepad(fakePad({ axes: [outside, -outside] }));
    assert.equal(state.right, true);
    assert.equal(state.up, true);
  });

  await t.test('a pad reporting fewer axes or buttons does not throw', () => {
    assert.doesNotThrow(() => readGamepad({ buttons: [], axes: [] }));
    assert.doesNotThrow(() => readGamepad({}));
  });
});

test('computeState: merging and edges', async (t) => {
  await t.test('keyboard and gamepad are OR\'d', () => {
    const state = computeState([
      readKeyboard(new Set(['ArrowUp'])),
      readGamepad(fakePad({ buttons: [14] })),
    ]);
    assert.equal(state.up, true);
    assert.equal(state.left, true);
  });

  await t.test('a null source is skipped', () => {
    const state = computeState([null, readKeyboard(new Set(['Space']))]);
    assert.equal(state.jump, true);
  });

  await t.test('jump edge fires on the first sample of a press', () => {
    const held = readKeyboard(new Set(['Space']));
    const first = computeState([held], emptyState());
    assert.equal(first.jump, true);
    assert.equal(first.jumpJustPressed, true);
  });

  await t.test('jump edge does not repeat while the key is held', () => {
    const held = readKeyboard(new Set(['Space']));
    const first = computeState([held], emptyState());
    const second = computeState([held], first);
    assert.equal(second.jump, true);
    assert.equal(second.jumpJustPressed, false);
  });

  await t.test('jump edge fires again after a release and re-press', () => {
    const held = readKeyboard(new Set(['Space']));
    const released = readKeyboard(new Set());
    const a = computeState([held], emptyState());
    const b = computeState([released], a);
    const c = computeState([held], b);
    assert.equal(b.jumpJustPressed, false);
    assert.equal(c.jumpJustPressed, true);
  });

  await t.test('a press and release between two samples still registers via the latch', () => {
    // The key is already up by sampling time, but the press happened.
    const state = computeState([readKeyboard(new Set())], emptyState(), true);
    assert.equal(state.jump, false);
    assert.equal(state.jumpJustPressed, true);
  });

  await t.test('steering is unaffected by the jump edge', () => {
    const held = readKeyboard(new Set(['ArrowLeft', 'ArrowUp', 'Space']));
    const first = computeState([held], emptyState());
    const second = computeState([held], first);
    assert.equal(second.left, true);
    assert.equal(second.up, true);
    assert.equal(second.jump, true);
    assert.equal(second.jumpJustPressed, false);
  });

  await t.test('emptyState is all false', () => {
    assert.deepEqual(emptyState(), {
      up: false, down: false, left: false, right: false, jump: false, jumpJustPressed: false,
    });
  });
});
