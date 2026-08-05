/**
 * Seeded enemy spawning. Uses `core/rng.js`, re-seeded identically at each
 * course start so patterns are learnable (spec §10). Never uses
 * `Math.random()` (CLAUDE.md §2.5).
 * @module systems/spawner
 */

/**
 * Create a spawner for a course.
 * @param {ReturnType<typeof import('../core/rng.js').create>} rng
 * @param {object} courseConfig
 * @returns {{ update: (dt: number) => object[] }}
 */
export function createSpawner(rng, courseConfig) {
  throw new Error('not implemented — see Phase 5');
}
