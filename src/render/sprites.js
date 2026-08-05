/**
 * Sprite sheet slicing and drawing, for originally-created art only
 * (CLAUDE.md §2.3 — no ripped assets).
 * @module render/sprites
 */

/**
 * Create a sprite sheet accessor.
 * @param {HTMLImageElement} image
 * @param {{ frameWidth: number, frameHeight: number }} config
 * @returns {{ draw: (ctx: CanvasRenderingContext2D, index: number, x: number, y: number) => void }}
 */
export function createSpriteSheet(image, config) {
  throw new Error('not implemented');
}
