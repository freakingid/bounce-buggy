/**
 * Player speed model and jump arc. Pure functions — testable without a
 * canvas per CLAUDE.md §5.
 * @module systems/physics
 */

/**
 * Advance the player's physics state by one fixed timestep.
 * @param {object} player - Player state (position, velocity, speed, airborne).
 * @param {object} input - Abstract input state for this tick.
 * @param {number} dt - Fixed timestep, seconds.
 * @returns {object} Updated player physics state.
 */
export function stepPlayerPhysics(player, input, dt) {
  throw new Error('not implemented — see Phase 2');
}
