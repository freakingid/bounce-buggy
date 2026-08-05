/**
 * Debug overlay: tuning UI, hitbox display, perf counters. Development
 * tooling only — never part of the shipped visual design.
 * @module render/debugOverlay
 */

/**
 * Create a debug overlay.
 * @param {{ ctx: CanvasRenderingContext2D }} config
 * @returns {{ draw: (state: object) => void }}
 */
export function createDebugOverlay(config) {
  throw new Error('not implemented');
}
