/**
 * Canvas setup: presentation scaling from the 256x240 logical play field to
 * an arbitrary display size, with letterboxing and nearest-neighbour
 * filtering for crisp pixel art (CLAUDE.md §3.2).
 * @module render/canvas
 */

/**
 * Create and configure the display canvas.
 * @param {{ canvas: HTMLCanvasElement }} config
 * @returns {{ ctx: CanvasRenderingContext2D, resize: () => void }}
 */
export function createCanvas(config) {
  throw new Error('not implemented — see Phase 1');
}
