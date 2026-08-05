/**
 * High-score table. Persists to `localStorage` under the frozen key
 * `bb_scores_v1` (CLAUDE.md §11) — never rename or merge this key; add
 * fields additively instead. Defaults to `HIGH_SCORE_DEFAULTS` from
 * `config/constants.js` (spec §7.6).
 * @module game/highScores
 */

/**
 * Load the high-score table from storage, falling back to the documented
 * defaults if none is saved.
 * @returns {{ initials: string, score: number }[]}
 */
export function loadHighScores() {
  throw new Error('not implemented — see Phase 9');
}

/**
 * Save the high-score table to storage.
 * @param {{ initials: string, score: number }[]} scores
 * @returns {void}
 */
export function saveHighScores(scores) {
  throw new Error('not implemented — see Phase 9');
}
