/**
 * Road geometry and scroll. Reads the fixed per-course segment tables from
 * `courses.js` — road layouts are not procedurally generated (spec §10).
 * @module world/road
 */

/**
 * Create a road for a course.
 * @param {object} course
 * @returns {{ boundsAt: (y: number) => { left: number, right: number } }}
 */
export function createRoad(course) {
  throw new Error('not implemented — see Phase 3');
}
