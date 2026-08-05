/**
 * Fixed-timestep game loop, decoupled from requestAnimationFrame per
 * CLAUDE.md §2.5. Simulation steps run at a fixed rate; rendering may
 * interpolate between steps but must never drive simulation state.
 *
 * **This module is the only place in the project allowed to express a
 * duration in ticks.** Everything else authors durations in seconds
 * (CLAUDE.md §3.3) and converts through `secondsToTicks()`. Gameplay code
 * reads the integer tick counter, never a wall clock.
 *
 * The accumulator itself is a pure function (`advance()`) so the timing model
 * can be tested without a browser, a canvas, or a real clock.
 * @module core/loop
 */

import { TICK_RATE_HZ } from '../config/constants.js';

/** Duration of one simulation step, in seconds. Derived — never hardcode 1/60. */
export const TICK_DURATION_SEC = 1 / TICK_RATE_HZ;

/**
 * Maximum simulation steps run in a single frame before surplus time is
 * discarded. Without this, returning to a backgrounded tab hands the loop a
 * multi-second delta, which it tries to simulate in one frame, which makes the
 * next delta larger still — the spiral of death. Dropping time is the correct
 * failure mode: the simulation stays real-time-ish and simply misses history.
 */
export const MAX_CATCH_UP_STEPS = 5;

/**
 * Wall-clock window over which the debug FPS/TPS counters average, ms.
 * Presentation only. A full second keeps the readout stable: over a shorter
 * window a single boundary tick lands as a whole ±2 ticks/sec of jitter.
 */
const METRICS_WINDOW_MS = 1000;

/**
 * Convert a duration in seconds to whole simulation ticks at an explicit rate.
 *
 * Exported separately from `secondsToTicks()` so tests can prove that changing
 * `TICK_RATE_HZ` rescales every duration consistently.
 *
 * A positive duration never rounds down to zero ticks: a duration the designer
 * bothered to author must last at least one tick, or it silently stops
 * existing at low tick rates.
 * @param {number} seconds - Non-negative, finite duration in seconds.
 * @param {number} rateHz - Simulation rate in Hz. Must be finite and > 0.
 * @returns {number} Whole ticks, rounded to nearest; 0 only for an input of 0.
 * @throws {Error} If `seconds` is negative or either argument is not finite.
 */
export function secondsToTicksAt(seconds, rateHz) {
  // Deliberate invariant guard (CLAUDE.md §5): a NaN duration would otherwise
  // become a NaN tick deadline that no comparison ever satisfies, producing a
  // timer that never fires and no error to explain why.
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error(`secondsToTicks: duration must be a non-negative finite number, got ${seconds}`);
  }
  if (!Number.isFinite(rateHz) || rateHz <= 0) {
    throw new Error(`secondsToTicks: rate must be a positive finite number, got ${rateHz}`);
  }
  if (seconds === 0) return 0;
  return Math.max(1, Math.round(seconds * rateHz));
}

/**
 * Convert a duration in seconds to whole simulation ticks at the project's
 * tick rate. The ONLY sanctioned way for a duration to enter the simulation.
 * @param {number} seconds - Non-negative, finite duration in seconds.
 * @returns {number} Whole ticks.
 */
export function secondsToTicks(seconds) {
  return secondsToTicksAt(seconds, TICK_RATE_HZ);
}

/**
 * Convert whole ticks back to seconds. For display and debug readouts only —
 * gameplay compares tick counts directly.
 * @param {number} ticks - Whole simulation ticks.
 * @returns {number} Equivalent duration in seconds.
 */
export function ticksToSeconds(ticks) {
  return ticks * TICK_DURATION_SEC;
}

/**
 * Advance the fixed-timestep accumulator by one frame's worth of elapsed time.
 *
 * Pure: no clock, no state, no side effects. Given an accumulator and a frame
 * delta it reports how many simulation steps the caller owes, what the
 * accumulator becomes afterwards, and the render interpolation alpha.
 * @param {number} accumulator - Leftover unsimulated time from the last frame, seconds.
 * @param {number} frameDeltaSec - Elapsed wall time since the last frame, seconds.
 *   Non-finite or negative values (clock skew, first frame) are treated as 0.
 * @param {{ stepSec?: number, maxSteps?: number }} [options] - Overrides, for tests.
 * @returns {{ steps: number, accumulator: number, alpha: number, droppedSteps: number }}
 *   `steps` to run now, the residual `accumulator`, the render `alpha` in [0,1),
 *   and `droppedSteps` discarded by the catch-up clamp (0 in normal operation).
 */
export function advance(accumulator, frameDeltaSec, options = {}) {
  const stepSec = options.stepSec ?? TICK_DURATION_SEC;
  const maxSteps = options.maxSteps ?? MAX_CATCH_UP_STEPS;

  const delta = Number.isFinite(frameDeltaSec) && frameDeltaSec > 0 ? frameDeltaSec : 0;
  const pending = accumulator + delta;

  let steps = Math.floor(pending / stepSec);
  let droppedSteps = 0;
  if (steps > maxSteps) {
    droppedSteps = steps - maxSteps;
    steps = maxSteps;
  }

  // Dropped steps are subtracted from the accumulator as well as the run
  // count: the residual is the sub-step remainder either way, so the loop
  // resumes in phase instead of carrying a backlog it will never work off.
  const residual = Math.max(0, pending - (steps + droppedSteps) * stepSec);
  const alpha = Math.min(residual / stepSec, 1);

  return { steps, accumulator: residual, alpha, droppedSteps };
}

/**
 * Create a fixed-timestep loop.
 *
 * `update` is called zero or more times per frame with the fixed step and the
 * current tick index. `render` is called exactly once per frame with the
 * interpolation alpha — at 60 Hz on a 60 Hz display alpha barely moves and
 * changes nothing, but on a 120/144 Hz display it is what keeps motion smooth.
 * @param {{
 *   update: (stepSec: number, tick: number) => void,
 *   render: (alpha: number, stats: object) => void,
 *   maxSteps?: number,
 *   now?: () => number,
 *   requestFrame?: (cb: (timestampMs: number) => void) => number,
 *   cancelFrame?: (handle: number) => void,
 * }} config - `now`/`requestFrame`/`cancelFrame` default to `performance.now`
 *   and `requestAnimationFrame`; inject them to drive the loop
 *   deterministically in tests.
 * @returns {{
 *   start: () => void,
 *   stop: () => void,
 *   getTick: () => number,
 *   getStats: () => object,
 * }}
 */
export function createLoop(config) {
  const { update, render } = config;
  const maxSteps = config.maxSteps ?? MAX_CATCH_UP_STEPS;
  const now = config.now ?? (() => performance.now());
  const requestFrame = config.requestFrame ?? ((cb) => requestAnimationFrame(cb));
  const cancelFrame = config.cancelFrame ?? ((handle) => cancelAnimationFrame(handle));

  let running = false;
  let frameHandle = null;
  let lastTimeMs = 0;
  let accumulator = 0;
  let tick = 0;

  // Debug readouts only. These are the one part of this module that reads a
  // wall clock; nothing here may ever feed the simulation (CLAUDE.md §2.5).
  let framesInWindow = 0;
  let ticksInWindow = 0;
  let windowStartMs = 0;
  const stats = {
    tick: 0,
    fps: 0,
    ticksPerSecond: 0,
    accumulator: 0,
    alpha: 0,
    stepsLastFrame: 0,
    droppedSteps: 0,
  };

  /**
   * Run one animation frame: catch the simulation up, then render once.
   * @param {number} [timestampMs] - Frame timestamp supplied by the scheduler.
   * @returns {void}
   */
  function frame(timestampMs) {
    if (!running) return;
    frameHandle = requestFrame(frame);

    const frameTimeMs = Number.isFinite(timestampMs) ? timestampMs : now();
    const deltaSec = (frameTimeMs - lastTimeMs) / 1000;
    lastTimeMs = frameTimeMs;

    const result = advance(accumulator, deltaSec, { maxSteps });
    accumulator = result.accumulator;

    for (let i = 0; i < result.steps; i += 1) {
      update(TICK_DURATION_SEC, tick);
      tick += 1;
    }

    framesInWindow += 1;
    ticksInWindow += result.steps;
    const windowElapsedMs = frameTimeMs - windowStartMs;
    if (windowElapsedMs >= METRICS_WINDOW_MS) {
      stats.fps = (framesInWindow * 1000) / windowElapsedMs;
      stats.ticksPerSecond = (ticksInWindow * 1000) / windowElapsedMs;
      framesInWindow = 0;
      ticksInWindow = 0;
      windowStartMs = frameTimeMs;
    }

    stats.tick = tick;
    stats.accumulator = accumulator;
    stats.alpha = result.alpha;
    stats.stepsLastFrame = result.steps;
    stats.droppedSteps += result.droppedSteps;

    render(result.alpha, stats);
  }

  return {
    /**
     * Begin running. Idempotent.
     * @returns {void}
     */
    start() {
      if (running) return;
      running = true;
      lastTimeMs = now();
      windowStartMs = lastTimeMs;
      framesInWindow = 0;
      ticksInWindow = 0;
      frameHandle = requestFrame(frame);
    },

    /**
     * Stop running. The tick counter and accumulator are preserved.
     * @returns {void}
     */
    stop() {
      running = false;
      if (frameHandle !== null) {
        cancelFrame(frameHandle);
        frameHandle = null;
      }
    },

    /** @returns {number} The current simulation tick — the project's clock. */
    getTick() {
      return tick;
    },

    /** @returns {object} Live debug metrics. Presentation only, never gameplay. */
    getStats() {
      return stats;
    },
  };
}
