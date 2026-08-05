/**
 * Owns all scoring: extra-car thresholds, the no-crash bonus flag, rollover,
 * and the survival-of-the-fittest latch. All points are routed through this
 * module — do not add points anywhere else (CLAUDE.md §5).
 * @module systems/scoring
 */

/**
 * Create a score tracker.
 * @param {object} config - DIP-equivalent settings (extra-car mode, etc).
 * @returns {{
 *   add: (points: number) => void,
 *   total: () => number,
 *   registerKill: (cause: string) => void,
 * }}
 */
export function createScoreTracker(config) {
  throw new Error('not implemented — see Phase 8');
}
