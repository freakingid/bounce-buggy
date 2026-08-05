/**
 * Fixed-timestep loop tests.
 *
 * The accumulator is tested as a pure function against explicit frame-delta
 * sequences — no clock, no browser, no timers. `createLoop` is driven through
 * an injected fake scheduler so tick counts are deterministic.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TICK_DURATION_SEC,
  MAX_CATCH_UP_STEPS,
  advance,
  createLoop,
  secondsToTicks,
  secondsToTicksAt,
  ticksToSeconds,
} from '../src/core/loop.js';
import { TICK_RATE_HZ } from '../src/config/constants.js';

/** Floating-point tolerance for accumulator comparisons, seconds. */
const EPSILON = 1e-9;

test('tick rate and derived step', async (t) => {
  await t.test('TICK_RATE_HZ is 60', () => {
    assert.equal(TICK_RATE_HZ, 60);
  });

  await t.test('step duration is derived from the tick rate, not hardcoded', () => {
    assert.equal(TICK_DURATION_SEC, 1 / TICK_RATE_HZ);
  });
});

test('advance: normal operation', async (t) => {
  await t.test('one exact step consumes the accumulator', () => {
    const result = advance(0, TICK_DURATION_SEC);
    assert.equal(result.steps, 1);
    assert.ok(Math.abs(result.accumulator) < EPSILON);
    assert.equal(result.droppedSteps, 0);
  });

  await t.test('a delta shorter than a step runs nothing and banks the time', () => {
    const result = advance(0, TICK_DURATION_SEC / 4);
    assert.equal(result.steps, 0);
    assert.ok(Math.abs(result.accumulator - TICK_DURATION_SEC / 4) < EPSILON);
  });

  await t.test('banked time accumulates until it reaches a whole step', () => {
    // A 240 Hz display: three frames of nothing, then one step on the fourth.
    const quarter = TICK_DURATION_SEC / 4;
    let acc = 0;
    const steps = [];
    for (let i = 0; i < 4; i += 1) {
      const result = advance(acc, quarter);
      acc = result.accumulator;
      steps.push(result.steps);
    }
    assert.deepEqual(steps, [0, 0, 0, 1]);
    assert.ok(Math.abs(acc) < EPSILON);
  });

  await t.test('a slow frame runs multiple steps and keeps the residual', () => {
    // 25 ms frame = 1.5 steps at 60 Hz.
    const result = advance(0, 0.025);
    assert.equal(result.steps, 1);
    assert.ok(Math.abs(result.accumulator - (0.025 - TICK_DURATION_SEC)) < EPSILON);
    assert.equal(result.droppedSteps, 0);
  });

  await t.test('residual carries into the next frame', () => {
    const first = advance(0, 0.025);
    const second = advance(first.accumulator, 0.025);
    assert.equal(second.steps, 2);
    assert.ok(Math.abs(second.accumulator - (0.05 - 3 * TICK_DURATION_SEC)) < EPSILON);
  });

  // The contract is "the simulation tracks elapsed real time", not "N frames
  // produce exactly N/60 ticks". A second's worth of frame deltas can total a
  // hair under 1.0 s in floating point, which legitimately yields 59 steps;
  // the shortfall is banked in the accumulator, not lost. Asserting exactly 60
  // would be asserting a float coincidence.
  await t.test('the step rate is independent of the frame rate', () => {
    for (const displayHz of [30, 60, 75, 120, 144, 240]) {
      const frameDelta = 1 / displayHz;
      let acc = 0;
      let total = 0;
      for (let i = 0; i < displayHz; i += 1) {
        const result = advance(acc, frameDelta);
        acc = result.accumulator;
        total += result.steps;
        assert.equal(result.droppedSteps, 0, `${displayHz} Hz dropped a step`);
      }
      assert.ok(
        Math.abs(total - TICK_RATE_HZ) <= 1,
        `${displayHz} Hz display produced ${total} steps in a simulated second`,
      );
    }
  });

  await t.test('drift stays bounded over a long run', () => {
    const frameDelta = 1 / 144;
    let acc = 0;
    let total = 0;
    for (let i = 0; i < 144 * 60; i += 1) { // one simulated minute
      const result = advance(acc, frameDelta);
      acc = result.accumulator;
      total += result.steps;
    }
    // Error must not grow with run length — a drifting loop would be seconds
    // out after a minute.
    assert.ok(Math.abs(total - TICK_RATE_HZ * 60) <= 1, `${total} steps in a simulated minute`);
  });
});

test('advance: alpha', async (t) => {
  await t.test('alpha is the fractional step position, in [0,1]', () => {
    const result = advance(0, TICK_DURATION_SEC * 1.5);
    assert.equal(result.steps, 1);
    assert.ok(Math.abs(result.alpha - 0.5) < 1e-6);
  });

  await t.test('alpha never leaves [0,1] across a long irregular sequence', () => {
    const deltas = [0.001, 0.016, 0.033, 0.008, 0.25, 0, 0.017, 2.0, 0.004];
    let acc = 0;
    for (const delta of deltas) {
      const result = advance(acc, delta);
      acc = result.accumulator;
      assert.ok(result.alpha >= 0 && result.alpha <= 1, `alpha out of range: ${result.alpha}`);
    }
  });
});

test('advance: spiral-of-death clamp', async (t) => {
  await t.test('a backgrounded-tab delta is clamped to MAX_CATCH_UP_STEPS', () => {
    // 10 seconds away = 600 steps owed.
    const result = advance(0, 10);
    assert.equal(result.steps, MAX_CATCH_UP_STEPS);
    assert.equal(result.droppedSteps, 600 - MAX_CATCH_UP_STEPS);
  });

  await t.test('dropped time is discarded, not banked', () => {
    const result = advance(0, 10);
    // Residual must be the sub-step remainder only — otherwise the next frame
    // would owe another 595 steps and the spiral never ends.
    assert.ok(result.accumulator < TICK_DURATION_SEC);
    assert.ok(result.accumulator >= 0);
  });

  await t.test('the loop recovers to normal stepping on the very next frame', () => {
    const stalled = advance(0, 10);
    const next = advance(stalled.accumulator, TICK_DURATION_SEC);
    assert.equal(next.steps, 1);
    assert.equal(next.droppedSteps, 0);
  });

  await t.test('the residual after a clamp preserves sub-step phase', () => {
    // 1.005 s = 60.3 steps: 60 whole steps' worth dropped/run, 0.005 s residual.
    const result = advance(0, 1.005);
    assert.equal(result.steps, MAX_CATCH_UP_STEPS);
    assert.ok(Math.abs(result.accumulator - 0.005) < 1e-6);
  });

  await t.test('maxSteps is overridable for tests', () => {
    const result = advance(0, 1, { maxSteps: 2 });
    assert.equal(result.steps, 2);
    assert.equal(result.droppedSteps, 58);
  });
});

test('advance: hostile deltas', async (t) => {
  await t.test('a negative delta (clock skew) runs nothing and preserves the accumulator', () => {
    const result = advance(0.004, -5);
    assert.equal(result.steps, 0);
    assert.ok(Math.abs(result.accumulator - 0.004) < EPSILON);
  });

  await t.test('NaN and Infinity deltas are treated as zero', () => {
    for (const bad of [NaN, Infinity, -Infinity, undefined]) {
      const result = advance(0.004, bad);
      assert.equal(result.steps, 0, `steps for ${bad}`);
      assert.ok(Number.isFinite(result.accumulator), `accumulator for ${bad}`);
    }
  });

  await t.test('a zero delta runs nothing', () => {
    const result = advance(0.004, 0);
    assert.equal(result.steps, 0);
  });
});

test('secondsToTicks', async (t) => {
  await t.test('whole seconds convert exactly', () => {
    assert.equal(secondsToTicks(1), 60);
    assert.equal(secondsToTicks(2), 120);
    assert.equal(secondsToTicks(0.5), 30);
  });

  await t.test('zero is the only duration that converts to zero ticks', () => {
    assert.equal(secondsToTicks(0), 0);
    assert.equal(secondsToTicks(0.0001), 1);
  });

  await t.test('rounds to nearest, not toward zero', () => {
    assert.equal(secondsToTicks(0.0251), 2); // 1.506 ticks
    assert.equal(secondsToTicks(0.024), 1); // 1.44 ticks
    assert.equal(secondsToTicks(1 / 60), 1);
  });

  await t.test('rejects negative and non-finite durations', () => {
    assert.throws(() => secondsToTicks(-1), /non-negative/);
    assert.throws(() => secondsToTicks(NaN), /non-negative/);
    assert.throws(() => secondsToTicks(Infinity), /non-negative/);
  });

  await t.test('rejects a non-positive rate', () => {
    assert.throws(() => secondsToTicksAt(1, 0), /positive/);
    assert.throws(() => secondsToTicksAt(1, -60), /positive/);
  });

  await t.test('ticksToSeconds round-trips within half a tick', () => {
    for (const seconds of [0, 0.25, 1, 1.5, 3.3]) {
      const back = ticksToSeconds(secondsToTicks(seconds));
      assert.ok(Math.abs(back - seconds) <= TICK_DURATION_SEC / 2 + EPSILON);
    }
  });
});

test('secondsToTicksAt: changing the tick rate rescales every duration consistently', async (t) => {
  // The real durations from tuning.js that Phase 2+ will convert.
  const durations = [0.6, 1.0, 1.5, 5, 0.004, 0.0];
  const rates = [30, 50, 60, 120, 144, 240];

  await t.test('every duration at least one tick long survives a rate change to within half a tick', () => {
    for (const rate of rates) {
      for (const seconds of durations) {
        if (seconds > 0 && seconds < 1 / rate) continue; // covered by the floor rule below
        const ticks = secondsToTicksAt(seconds, rate);
        const back = ticks / rate;
        assert.ok(
          Math.abs(back - seconds) <= 0.5 / rate + EPSILON,
          `duration ${seconds}s at ${rate}Hz became ${ticks} ticks (${back}s)`,
        );
      }
    }
  });

  await t.test('a sub-tick duration clamps to one tick at every rate, never to zero', () => {
    // 0.004 s is shorter than one tick at every rate here. It must still
    // happen — silently becoming instantaneous is the failure mode this guards.
    for (const rate of rates) {
      assert.equal(secondsToTicksAt(0.004, rate), 1, `rate ${rate}`);
    }
  });

  await t.test('doubling the rate doubles the tick count for whole-tick durations', () => {
    // Only holds where the duration is an exact multiple of the base step;
    // elsewhere rounding legitimately breaks the identity.
    for (const seconds of [0.5, 1.0, 1.5, 5]) {
      assert.equal(secondsToTicksAt(seconds, 120), secondsToTicksAt(seconds, 60) * 2);
      assert.equal(secondsToTicksAt(seconds, 60), secondsToTicksAt(seconds, 30) * 2);
    }
  });

  await t.test('ordering of durations is preserved at every rate', () => {
    const sorted = [...durations].sort((a, b) => a - b);
    for (const rate of rates) {
      const ticks = sorted.map((s) => secondsToTicksAt(s, rate));
      for (let i = 1; i < ticks.length; i += 1) {
        assert.ok(ticks[i] >= ticks[i - 1], `rate ${rate} reordered ${sorted[i - 1]} vs ${sorted[i]}`);
      }
    }
  });

  await t.test('secondsToTicks equals secondsToTicksAt at the project rate', () => {
    for (const seconds of durations) {
      assert.equal(secondsToTicks(seconds), secondsToTicksAt(seconds, TICK_RATE_HZ));
    }
  });
});

/**
 * Build a fake frame scheduler that fires frames at a fixed cadence.
 * @param {number} frameMs - Simulated milliseconds between frames.
 * @returns {{ now: () => number, requestFrame: Function, cancelFrame: Function,
 *   runFrames: (count: number) => void, skipAhead: (ms: number) => void }} Fake scheduler.
 */
function createFakeScheduler(frameMs) {
  let clockMs = 0;
  let pending = null;
  let handle = 0;

  return {
    now: () => clockMs,
    requestFrame(callback) {
      pending = callback;
      handle += 1;
      return handle;
    },
    cancelFrame() {
      pending = null;
    },
    runFrames(count) {
      for (let i = 0; i < count; i += 1) {
        clockMs += frameMs;
        const callback = pending;
        pending = null;
        if (callback) callback(clockMs);
      }
    },
    skipAhead(ms) {
      clockMs += ms;
      const callback = pending;
      pending = null;
      if (callback) callback(clockMs);
    },
  };
}

test('createLoop', async (t) => {
  await t.test('runs ~60 ticks per simulated second whatever the display rate', () => {
    for (const displayHz of [60, 75, 120, 144]) {
      const scheduler = createFakeScheduler(1000 / displayHz);
      let ticks = 0;
      let frames = 0;
      const loop = createLoop({
        update: () => { ticks += 1; },
        render: () => { frames += 1; },
        now: scheduler.now,
        requestFrame: scheduler.requestFrame,
        cancelFrame: scheduler.cancelFrame,
      });
      loop.start();
      scheduler.runFrames(displayHz); // one simulated second
      loop.stop();

      assert.equal(frames, displayHz, `${displayHz} Hz: one render per frame`);
      assert.ok(
        Math.abs(ticks - TICK_RATE_HZ) <= 1,
        `${displayHz} Hz display ran ${ticks} ticks in a simulated second`,
      );
      assert.equal(loop.getTick(), ticks);
    }
  });

  await t.test('renders once per frame even when no simulation step is owed', () => {
    const scheduler = createFakeScheduler(1); // 1000 Hz: mostly step-less frames
    let ticks = 0;
    let frames = 0;
    const loop = createLoop({
      update: () => { ticks += 1; },
      render: () => { frames += 1; },
      now: scheduler.now,
      requestFrame: scheduler.requestFrame,
      cancelFrame: scheduler.cancelFrame,
    });
    loop.start();
    scheduler.runFrames(100);
    loop.stop();

    assert.equal(frames, 100);
    assert.equal(ticks, 6);
  });

  await t.test('the tick counter increases monotonically and is passed to update', () => {
    const scheduler = createFakeScheduler(1000 / 60);
    const seen = [];
    const loop = createLoop({
      update: (stepSec, tick) => {
        assert.equal(stepSec, TICK_DURATION_SEC);
        seen.push(tick);
      },
      render: () => {},
      now: scheduler.now,
      requestFrame: scheduler.requestFrame,
      cancelFrame: scheduler.cancelFrame,
    });
    loop.start();
    scheduler.runFrames(10);
    loop.stop();

    assert.ok(seen.length >= 9);
    assert.equal(seen[0], 0, 'the tick counter starts at 0');
    for (let i = 1; i < seen.length; i += 1) {
      assert.equal(seen[i], seen[i - 1] + 1, 'ticks must increase by exactly 1, never skip');
    }
  });

  await t.test('a backgrounded tab does not run a burst of catch-up ticks', () => {
    const scheduler = createFakeScheduler(1000 / 60);
    let ticks = 0;
    const loop = createLoop({
      update: () => { ticks += 1; },
      render: () => {},
      now: scheduler.now,
      requestFrame: scheduler.requestFrame,
      cancelFrame: scheduler.cancelFrame,
    });
    loop.start();
    scheduler.skipAhead(30000); // 30 s backgrounded
    loop.stop();

    assert.equal(ticks, MAX_CATCH_UP_STEPS);
    assert.ok(loop.getStats().droppedSteps > 0);
  });

  await t.test('stop() halts stepping and start() resumes without a time debt', () => {
    const scheduler = createFakeScheduler(1000 / 60);
    let ticks = 0;
    const loop = createLoop({
      update: () => { ticks += 1; },
      render: () => {},
      now: scheduler.now,
      requestFrame: scheduler.requestFrame,
      cancelFrame: scheduler.cancelFrame,
    });
    loop.start();
    scheduler.runFrames(5);
    const beforePause = ticks;
    loop.stop();
    scheduler.skipAhead(10000); // paused for 10 s
    assert.equal(ticks, beforePause, 'a stopped loop must not step');

    loop.start();
    scheduler.runFrames(5);
    loop.stop();
    assert.ok(
      ticks - beforePause <= 5,
      `resuming replayed the paused time: ${ticks - beforePause} ticks in 5 frames`,
    );
  });

  await t.test('render receives the interpolation alpha', () => {
    const scheduler = createFakeScheduler(1000 / 144);
    const alphas = [];
    const loop = createLoop({
      update: () => {},
      render: (alpha) => { alphas.push(alpha); },
      now: scheduler.now,
      requestFrame: scheduler.requestFrame,
      cancelFrame: scheduler.cancelFrame,
    });
    loop.start();
    scheduler.runFrames(20);
    loop.stop();

    assert.equal(alphas.length, 20);
    assert.ok(alphas.every((a) => a >= 0 && a <= 1));
    assert.ok(alphas.some((a) => a > 0), 'a 144 Hz display must produce sub-step alphas');
  });

  await t.test('reported ticks/sec holds at the tick rate regardless of frame rate', () => {
    for (const displayHz of [60, 120, 144]) {
      const scheduler = createFakeScheduler(1000 / displayHz);
      const loop = createLoop({
        update: () => {},
        render: () => {},
        now: scheduler.now,
        requestFrame: scheduler.requestFrame,
        cancelFrame: scheduler.cancelFrame,
      });
      loop.start();
      scheduler.runFrames(displayHz * 3); // three simulated seconds
      loop.stop();

      const tps = loop.getStats().ticksPerSecond;
      assert.ok(
        Math.abs(tps - TICK_RATE_HZ) <= 1.5,
        `${displayHz} Hz display reported ${tps} ticks/sec`,
      );
    }
  });
});
