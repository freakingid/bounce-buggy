/**
 * Keyboard + Gamepad API input, mapped to an abstract input state. Handles
 * simultaneous key rollover so "accelerate + steer" works together — the
 * original cabinet had an 8-way joystick plus one button (CLAUDE.md §9), and
 * diagonal input is normal play, not an edge case.
 *
 * The mapping layer is pure (`readKeyboard`, `readGamepad`, `computeState`) so
 * it is testable without a DOM. Only `createInput()` touches the browser.
 *
 * Input is sampled once per simulation tick, not per animation frame: on a
 * 144 Hz display, sampling per frame would let the same physical key press be
 * read a different number of times run-to-run, which breaks determinism.
 * @module core/input
 */

import { GAMEPAD_STICK_DEADZONE } from '../config/tuning.js';

/**
 * `KeyboardEvent.code` → abstract action. Arrows and WASD both steer; Space
 * jumps. Codes are physical, so the bindings survive non-QWERTY layouts.
 */
export const KEY_BINDINGS = Object.freeze({
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'jump',
});

/** Standard-gamepad button index → abstract action (d-pad + one face button). */
export const GAMEPAD_BUTTON_BINDINGS = Object.freeze({
  0: 'jump', // bottom face button
  12: 'up',
  13: 'down',
  14: 'left',
  15: 'right',
});

/** Standard-gamepad axis indices for the left stick. */
const GAMEPAD_AXIS_X = 0;
const GAMEPAD_AXIS_Y = 1;

/**
 * A neutral input state.
 * @returns {{ up: boolean, down: boolean, left: boolean, right: boolean,
 *   jump: boolean, jumpJustPressed: boolean }} All-false state.
 */
export function emptyState() {
  return { up: false, down: false, left: false, right: false, jump: false, jumpJustPressed: false };
}

/**
 * Map a `KeyboardEvent.code` to an abstract action.
 * @param {string} code - A `KeyboardEvent.code` value.
 * @returns {string|null} The action name, or null if the key is unbound.
 */
export function actionForCode(code) {
  return KEY_BINDINGS[code] ?? null;
}

/**
 * Derive a raw action state from the set of physically held key codes.
 *
 * Every held key contributes independently, so any combination registers —
 * "accelerate + steer" is just two actions true at once.
 * @param {Set<string>|Iterable<string>} heldCodes - Currently held `KeyboardEvent.code` values.
 * @returns {{ up: boolean, down: boolean, left: boolean, right: boolean, jump: boolean }} Raw state.
 */
export function readKeyboard(heldCodes) {
  const state = { up: false, down: false, left: false, right: false, jump: false };
  for (const code of heldCodes) {
    const action = actionForCode(code);
    if (action !== null) state[action] = true;
  }
  return state;
}

/**
 * Derive a raw action state from a Gamepad snapshot.
 *
 * The left stick is digitised against a deadzone because the game's control
 * model is 8-way digital; analogue magnitude has nowhere to go. D-pad and
 * stick are OR'd, so either works and both together is harmless.
 * @param {{ buttons?: Array<{pressed: boolean}|number>, axes?: number[] }|null} pad -
 *   A Gamepad-like object, or null when no pad is connected.
 * @param {number} [deadzone] - Stick magnitude below which an axis reads centred.
 * @returns {{ up: boolean, down: boolean, left: boolean, right: boolean, jump: boolean }} Raw state.
 */
export function readGamepad(pad, deadzone = GAMEPAD_STICK_DEADZONE) {
  const state = { up: false, down: false, left: false, right: false, jump: false };
  if (!pad) return state;

  const buttons = pad.buttons ?? [];
  for (const [index, action] of Object.entries(GAMEPAD_BUTTON_BINDINGS)) {
    const button = buttons[Number(index)];
    if (button === undefined) continue;
    const pressed = typeof button === 'number' ? button > 0 : Boolean(button.pressed);
    if (pressed) state[action] = true;
  }

  const axes = pad.axes ?? [];
  const x = axes[GAMEPAD_AXIS_X] ?? 0;
  const y = axes[GAMEPAD_AXIS_Y] ?? 0;
  if (x <= -deadzone) state.left = true;
  if (x >= deadzone) state.right = true;
  // Gamepad Y is positive-down, matching screen coordinates.
  if (y <= -deadzone) state.up = true;
  if (y >= deadzone) state.down = true;

  return state;
}

/**
 * Merge raw source states and derive edge-detected flags.
 * @param {Array<object>} sources - Raw action states (keyboard, gamepad, ...), OR'd together.
 * @param {object|null} [previous] - The state from the previous sample, for edge detection.
 * @param {boolean} [jumpPulse] - True if a jump press landed since the last
 *   sample even though the key is no longer held. Without this latch, a press
 *   and release that both fall between two samples is silently lost.
 * @returns {{ up: boolean, down: boolean, left: boolean, right: boolean,
 *   jump: boolean, jumpJustPressed: boolean }} Merged state.
 */
export function computeState(sources, previous = null, jumpPulse = false) {
  const state = emptyState();
  for (const source of sources) {
    if (!source) continue;
    state.up = state.up || Boolean(source.up);
    state.down = state.down || Boolean(source.down);
    state.left = state.left || Boolean(source.left);
    state.right = state.right || Boolean(source.right);
    state.jump = state.jump || Boolean(source.jump);
  }
  const wasJumping = previous ? Boolean(previous.jump) : false;
  state.jumpJustPressed = (state.jump && !wasJumping) || jumpPulse;
  return state;
}

/**
 * Create a live input tracker bound to the DOM and the Gamepad API.
 *
 * Listeners record raw held state as events arrive; `sample()` collapses that
 * into the abstract state and must be called exactly once per simulation tick.
 * @param {{ target?: EventTarget, gamepadIndex?: number }} [config] - `target`
 *   defaults to `window`; `gamepadIndex` selects which connected pad to read.
 * @returns {{
 *   sample: () => object,
 *   getState: () => object,
 *   clear: () => void,
 *   destroy: () => void,
 * }}
 */
export function createInput(config = {}) {
  const target = config.target ?? window;
  const gamepadIndex = config.gamepadIndex ?? 0;

  const heldCodes = new Set();
  let jumpPulse = false;
  let previous = emptyState();
  let state = emptyState();

  /**
   * @param {KeyboardEvent} event - The keydown event.
   * @returns {void}
   */
  function onKeyDown(event) {
    const action = actionForCode(event.code);
    if (action === null) return;
    // Arrows and Space scroll the page otherwise.
    event.preventDefault();
    if (event.repeat) return;
    heldCodes.add(event.code);
    if (action === 'jump') jumpPulse = true;
  }

  /**
   * @param {KeyboardEvent} event - The keyup event.
   * @returns {void}
   */
  function onKeyUp(event) {
    if (actionForCode(event.code) === null) return;
    event.preventDefault();
    heldCodes.delete(event.code);
  }

  /**
   * Losing focus means we never see the matching keyup, which would leave a
   * key stuck on. The pending jump pulse is kept: that press really happened.
   * @returns {void}
   */
  function onBlur() {
    heldCodes.clear();
  }

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', onBlur);

  /**
   * @returns {object|null} The active Gamepad snapshot, or null if none.
   */
  function pollGamepad() {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return null;
    const pads = navigator.getGamepads();
    if (!pads) return null;
    const pad = pads[gamepadIndex];
    return pad && pad.connected !== false ? pad : null;
  }

  return {
    /**
     * Collapse raw input into the abstract state. Call once per simulation tick.
     * @returns {object} The freshly sampled state.
     */
    sample() {
      const keyboard = readKeyboard(heldCodes);
      const gamepad = readGamepad(pollGamepad());
      state = computeState([keyboard, gamepad], previous, jumpPulse);
      jumpPulse = false;
      previous = state;
      return state;
    },

    /** @returns {object} The most recently sampled state. Does not re-sample. */
    getState() {
      return state;
    },

    /**
     * Drop all held input and edge history (used on pause / state transitions).
     * @returns {void}
     */
    clear() {
      heldCodes.clear();
      jumpPulse = false;
      previous = emptyState();
      state = emptyState();
    },

    /** @returns {void} */
    destroy() {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('blur', onBlur);
      heldCodes.clear();
    },
  };
}
