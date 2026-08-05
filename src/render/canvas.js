/**
 * Canvas setup: presentation scaling from the 256x240 logical play field to
 * an arbitrary display size, with letterboxing and nearest-neighbour
 * filtering for crisp pixel art (CLAUDE.md §3.2).
 *
 * All drawing goes to an offscreen backbuffer that is always exactly
 * 256 x 240. The play field is a coordinate space, not a resolution: gameplay
 * code never knows or cares what size the window is. `present()` blits the
 * backbuffer to the visible canvas at the largest aspect-preserving scale
 * that fits, and blacks out the remainder.
 * @module render/canvas
 */

import { PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT } from '../config/constants.js';

/** Colour of the letterbox bars outside the play field. */
const LETTERBOX_COLOUR = '#000000';

/**
 * Create and configure the display canvas.
 * @param {{ canvas: HTMLCanvasElement }} config - The visible canvas element.
 * @returns {{
 *   ctx: CanvasRenderingContext2D,
 *   backbuffer: HTMLCanvasElement,
 *   displayCtx: CanvasRenderingContext2D,
 *   resize: () => boolean,
 *   present: () => void,
 *   clear: (colour?: string) => void,
 *   getViewport: () => { scale: number, offsetX: number, offsetY: number,
 *     deviceWidth: number, deviceHeight: number, dpr: number },
 *   destroy: () => void,
 * }} `ctx` is the backbuffer context — the one all drawing uses.
 */
export function createCanvas(config) {
  const displayCanvas = config.canvas;

  const backbuffer = document.createElement('canvas');
  backbuffer.width = PLAYFIELD_WIDTH;
  backbuffer.height = PLAYFIELD_HEIGHT;
  const ctx = backbuffer.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const displayCtx = displayCanvas.getContext('2d', { alpha: false });

  let deviceWidth = 0;
  let deviceHeight = 0;
  let dpr = 0;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let layoutDirty = true;

  /**
   * Recompute the display backing store and letterbox geometry if the CSS box
   * or the device pixel ratio changed.
   *
   * The backing store is sized in *device* pixels and the blit is computed in
   * device pixels, so a 2x-DPI display gets twice the presentation resolution
   * rather than a browser-upscaled blur.
   * @returns {boolean} True if anything actually changed.
   */
  function resize() {
    const rect = displayCanvas.getBoundingClientRect();
    const ratio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const nextWidth = Math.max(1, Math.round(rect.width * ratio));
    const nextHeight = Math.max(1, Math.round(rect.height * ratio));

    layoutDirty = false;
    if (nextWidth === deviceWidth && nextHeight === deviceHeight && ratio === dpr) return false;

    deviceWidth = nextWidth;
    deviceHeight = nextHeight;
    dpr = ratio;
    displayCanvas.width = deviceWidth;
    displayCanvas.height = deviceHeight;
    // Assigning width/height resets every context property, including the
    // smoothing flag. Re-apply it here or the game goes blurry on any resize.
    displayCtx.imageSmoothingEnabled = false;

    // Free (non-integer) scaling, aspect preserved — CLAUDE.md §3.2.
    scale = Math.min(deviceWidth / PLAYFIELD_WIDTH, deviceHeight / PLAYFIELD_HEIGHT);
    offsetX = Math.round((deviceWidth - PLAYFIELD_WIDTH * scale) / 2);
    offsetY = Math.round((deviceHeight - PLAYFIELD_HEIGHT * scale) / 2);
    return true;
  }

  /**
   * Mark the layout stale so the next `present()` recomputes it. Cheaper than
   * measuring the DOM every frame.
   * @returns {void}
   */
  function markDirty() {
    layoutDirty = true;
  }

  /**
   * Fill the whole backbuffer with a solid colour.
   * @param {string} [colour] - CSS colour. Defaults to black.
   * @returns {void}
   */
  function clear(colour = LETTERBOX_COLOUR) {
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
  }

  /**
   * Blit the backbuffer to the visible canvas, letterboxed and centred.
   * @returns {void}
   */
  function present() {
    // devicePixelRatio changes with browser zoom or a drag between monitors
    // and fires no resize event of its own on every platform, so check it here.
    const ratio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    if (layoutDirty || ratio !== dpr) resize();

    displayCtx.fillStyle = LETTERBOX_COLOUR;
    displayCtx.fillRect(0, 0, deviceWidth, deviceHeight);
    displayCtx.drawImage(
      backbuffer,
      0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT,
      offsetX, offsetY, PLAYFIELD_WIDTH * scale, PLAYFIELD_HEIGHT * scale,
    );
  }

  let observer = null;
  if (typeof ResizeObserver === 'function') {
    observer = new ResizeObserver(markDirty);
    observer.observe(displayCanvas);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', markDirty);
  }
  resize();

  return {
    ctx,
    backbuffer,
    displayCtx,
    resize,
    present,
    clear,

    /** @returns {object} Current presentation geometry, for debug readouts. */
    getViewport() {
      return { scale, offsetX, offsetY, deviceWidth, deviceHeight, dpr };
    },

    /** @returns {void} */
    destroy() {
      if (observer) observer.disconnect();
      if (typeof window !== 'undefined') window.removeEventListener('resize', markDirty);
    },
  };
}
