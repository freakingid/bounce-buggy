/**
 * The seven documented segment archetypes (spec §6.1): freeway, shrub
 * edges, lake-on-left, bridge-out, double-jump, bridge-on-left with
 * islands-on-right, split highway. Each is a data-driven generator
 * producing boundary geometry plus metadata.
 * @module world/segments
 */

/**
 * Generate a road segment from an archetype.
 * @param {string} archetype
 * @param {object} params
 * @returns {object} Segment geometry and metadata.
 */
export function generateSegment(archetype, params) {
  throw new Error('not implemented — see Phase 7');
}
