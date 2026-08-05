/**
 * Colour tables. The original's 16-colour PROM palette was a hardware
 * limit, not a design rule (CLAUDE.md §3.1) — a constrained palette here is
 * an aesthetic choice, not a requirement.
 * @module render/palette
 */

/**
 * Get a named colour palette.
 * @param {string} name
 * @returns {string[]} Array of CSS colour strings.
 */
export function getPalette(name) {
  throw new Error('not implemented');
}
