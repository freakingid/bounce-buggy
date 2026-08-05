/**
 * Seeded PRNG (mulberry32). `Math.random()` is banned in gameplay code per
 * CLAUDE.md §2.5 — this is the only source of randomness gameplay may use,
 * so a run is fully reproducible from a seed.
 * @module core/rng
 */

/**
 * Create a seeded PRNG instance.
 * @param {number} seed - 32-bit seed. Non-integer or out-of-range values are
 *   coerced with `>>> 0`.
 * @returns {{
 *   next: () => number,
 *   nextInt: (min: number, max: number) => number,
 *   snapshot: () => number,
 *   restore: (state: number) => void,
 * }}
 */
export function create(seed) {
  let state = seed >>> 0;

  /**
   * @returns {number} Next pseudo-random float in [0, 1).
   */
  function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * @param {number} min - Inclusive lower bound.
   * @param {number} max - Inclusive upper bound.
   * @returns {number} Pseudo-random integer in [min, max].
   */
  function nextInt(min, max) {
    return Math.floor(next() * (max - min + 1)) + min;
  }

  /**
   * @returns {number} Opaque snapshot of the current internal state.
   */
  function snapshot() {
    return state;
  }

  /**
   * @param {number} snapshotState - A value previously returned by `snapshot()`.
   * @returns {void}
   */
  function restore(snapshotState) {
    state = snapshotState >>> 0;
  }

  return { next, nextInt, snapshot, restore };
}
