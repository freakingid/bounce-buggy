/**
 * Car-to-car ricochet physics (spec §3). Applies to all cars; trucks are
 * not bumpable (spec §5.1). Pure function — the caller applies the deltas.
 * @module systems/bump
 */

/**
 * Resolve a bump between two cars.
 * @param {object} player - The player (or bumping) car's state.
 * @param {object} other - The other car's state.
 * @param {'FRONT'|'REAR'|'LEFT'|'RIGHT'} contactSide - Contact side, derived
 *   from relative position and velocity.
 * @param {number} relativeSpeed - Relative speed at contact.
 * @returns {{
 *   playerDelta: { vx: number, speed: number },
 *   otherDelta: { vx: number, speed: number },
 * }}
 */
export function resolveBump(player, other, contactSide, relativeSpeed) {
  throw new Error('not implemented — see Phase 4');
}
