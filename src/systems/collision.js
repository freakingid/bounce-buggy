/**
 * AABB collision, boundary, water, and debris checks. Pure functions —
 * testable without a canvas per CLAUDE.md §5.
 * @module systems/collision
 */

/**
 * Check whether two axis-aligned boxes overlap.
 * @param {{ x: number, y: number, width: number, height: number }} a
 * @param {{ x: number, y: number, width: number, height: number }} b
 * @returns {boolean}
 */
export function checkAabbOverlap(a, b) {
  throw new Error('not implemented — see Phase 4');
}
