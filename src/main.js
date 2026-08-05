/**
 * Entry point. Bootstraps the engine: scaled canvas, fixed-timestep loop,
 * input sampling, and the debug overlay.
 *
 * There is no gameplay yet (Phase 2 onward). The loop runs, samples input
 * once per simulation tick, and renders a black play field; the overlay is
 * the only thing that draws, and only when toggled.
 * @module main
 */

import { createCanvas } from './render/canvas.js';
import { createDebugOverlay } from './render/debugOverlay.js';
import { createInput } from './core/input.js';
import { createLoop } from './core/loop.js';

/** `KeyboardEvent.code` that toggles the debug overlay. Debug only, not a game binding. */
const DEBUG_TOGGLE_CODE = 'Backquote';

/** Play field background colour while there is nothing to draw. */
const FIELD_COLOUR = '#000000';

const display = createCanvas({ canvas: document.getElementById('game') });
const overlay = createDebugOverlay({ ctx: display.ctx });
const input = createInput();

// The overlay toggle is developer tooling, deliberately kept out of the
// abstract input state so it can never be read as a gameplay action.
window.addEventListener('keydown', (event) => {
  if (event.code === DEBUG_TOGGLE_CODE) {
    event.preventDefault();
    overlay.toggle();
  }
});

/** Most recent sampled input, kept for the overlay readout between ticks. */
let inputState = input.getState();

/**
 * One simulation step. Runs at a fixed rate, zero or more times per frame.
 * @param {number} stepSec - The fixed timestep, seconds.
 * @param {number} tick - The current simulation tick.
 * @returns {void}
 */
function update(stepSec, tick) {
  // Sampled here, not in render(): input must advance in lockstep with the
  // simulation, not with the display's refresh rate.
  inputState = input.sample();
}

/**
 * Render one frame.
 * @param {number} alpha - Interpolation factor in [0,1) between the last
 *   simulation step and the next. Unused until entities exist to interpolate.
 * @param {object} stats - Loop metrics for the debug overlay.
 * @returns {void}
 */
function render(alpha, stats) {
  display.clear(FIELD_COLOUR);
  overlay.draw({ stats, input: inputState, viewport: display.getViewport() });
  display.present();
}

const loop = createLoop({ update, render });
loop.start();
