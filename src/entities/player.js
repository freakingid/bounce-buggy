/**
 * Player vehicle entity. Follows the uniform entity contract (CLAUDE.md §5):
 * a factory, `update(dt)`, `draw(ctx)`, and a `dead` boolean on the instance.
 * @module entities/player
 */

/**
 * Create a player entity.
 * @param {{ x: number, y: number }} config - Initial position.
 * @returns {object} Player entity instance.
 */
export function createPlayer(config) {
  throw new Error('not implemented — see Phase 2');
}
