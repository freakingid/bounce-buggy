/**
 * Owns entity collections and lifecycle. Entities are killed by setting
 * `dead = true`; dead entities are filtered out once, at the end of the
 * frame — never spliced mid-loop (CLAUDE.md §5).
 * @module entities/entityManager
 */

/**
 * Create an entity manager.
 * @returns {{
 *   add: (entity: object) => void,
 *   update: (dt: number) => void,
 *   draw: (ctx: CanvasRenderingContext2D) => void,
 *   all: () => object[],
 * }}
 */
export function createEntityManager() {
  throw new Error('not implemented');
}
