/**
 * Season cycle: Spring -> Summer -> Fall -> Winter (spec §6.3). Level 1 has
 * no season.
 * @module world/seasons
 */

/**
 * Get the season for a level.
 * @param {number} level - 1-based level number.
 * @returns {string|null} Season name, or null for level 1.
 */
export function getSeason(level) {
  throw new Error('not implemented — see Phase 7');
}
