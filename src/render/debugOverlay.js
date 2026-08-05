/**
 * Debug overlay: tuning UI, hitbox display, perf counters. Development
 * tooling only — never part of the shipped visual design.
 *
 * Draws into the 256x240 backbuffer in logical coordinates, so what it
 * reports is measured in the same space the game runs in. Toggled with the
 * backtick key by the caller.
 * @module render/debugOverlay
 */

import { PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT, TICK_RATE_HZ } from '../config/constants.js';

/** Text size, px. 8 matches the foreground tile grid, so lines land on pixel rows. */
const TEXT_SIZE_PX = 8;

/** Vertical distance between overlay lines, px. */
const LINE_HEIGHT_PX = 9;

/** Inset of the overlay panel from the play field edge, px. */
const PANEL_MARGIN_PX = 2;

/** Panel background, semi-transparent so the game stays visible underneath. */
const PANEL_FILL = 'rgba(0, 0, 0, 0.65)';

/** Normal readout colour. */
const TEXT_COLOUR = '#00ff66';

/** Colour for a readout that is out of its expected range. */
const WARN_COLOUR = '#ff5555';

/** Colour of the play field outline. */
const BOUNDS_COLOUR = '#333333';

/** Tolerance on the measured tick rate before it is flagged, ticks/sec. */
const TICK_RATE_TOLERANCE = 1.5;

/**
 * Create a debug overlay.
 * @param {{ ctx: CanvasRenderingContext2D, visible?: boolean }} config -
 *   `ctx` is the backbuffer context.
 * @returns {{
 *   draw: (state: object) => void,
 *   toggle: () => boolean,
 *   setVisible: (value: boolean) => void,
 *   isVisible: () => boolean,
 * }}
 */
export function createDebugOverlay(config) {
  const { ctx } = config;
  let visible = config.visible ?? false;

  /**
   * Render one line of text and advance the cursor.
   * @param {string} text - The line to draw.
   * @param {number} y - Baseline y, logical px.
   * @param {string} colour - CSS colour.
   * @returns {void}
   */
  function line(text, y, colour) {
    ctx.fillStyle = colour;
    ctx.fillText(text, PANEL_MARGIN_PX + 2, y);
  }

  /**
   * Format the abstract input state as a compact held-actions string.
   * @param {object|null} input - The current input state.
   * @returns {string} e.g. `U- L- ^` with held actions capitalised.
   */
  function formatInput(input) {
    if (!input) return 'INPUT n/a';
    const flag = (on, label) => (on ? label : '.');
    return `IN ${flag(input.up, 'U')}${flag(input.down, 'D')}${flag(input.left, 'L')}`
      + `${flag(input.right, 'R')} JMP ${flag(input.jump, 'J')}`
      + ` EDGE ${flag(input.jumpJustPressed, '!')}`;
  }

  return {
    /**
     * Draw the overlay. A no-op when hidden.
     * @param {{ stats?: object, input?: object, viewport?: object }} state -
     *   `stats` from the loop, `input` from the input sampler, `viewport` from
     *   the canvas.
     * @returns {void}
     */
    draw(state) {
      if (!visible) return;

      const stats = state.stats ?? {};
      const viewport = state.viewport ?? {};

      // Play field outline: with a black field on a black letterbox there is
      // otherwise nothing on screen to prove the scaling is correct.
      ctx.strokeStyle = BOUNDS_COLOUR;
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, PLAYFIELD_WIDTH - 1, PLAYFIELD_HEIGHT - 1);

      const lines = [
        {
          text: `FPS ${(stats.fps ?? 0).toFixed(1)}`,
          warn: false,
        },
        {
          text: `TPS ${(stats.ticksPerSecond ?? 0).toFixed(2)} / ${TICK_RATE_HZ}`,
          warn: Math.abs((stats.ticksPerSecond ?? 0) - TICK_RATE_HZ) > TICK_RATE_TOLERANCE,
        },
        { text: `TICK ${stats.tick ?? 0}`, warn: false },
        {
          text: `ACC ${((stats.accumulator ?? 0) * 1000).toFixed(3)}ms`
            + ` A ${(stats.alpha ?? 0).toFixed(3)}`,
          warn: false,
        },
        {
          text: `STEPS ${stats.stepsLastFrame ?? 0} DROP ${stats.droppedSteps ?? 0}`,
          warn: (stats.droppedSteps ?? 0) > 0,
        },
        { text: formatInput(state.input), warn: false },
        {
          text: `SCALE ${(viewport.scale ?? 0).toFixed(2)}x DPR ${viewport.dpr ?? 0}`,
          warn: false,
        },
      ];

      const panelHeight = lines.length * LINE_HEIGHT_PX + 4;
      ctx.fillStyle = PANEL_FILL;
      ctx.fillRect(
        PANEL_MARGIN_PX,
        PANEL_MARGIN_PX,
        PLAYFIELD_WIDTH - PANEL_MARGIN_PX * 2,
        panelHeight,
      );

      ctx.font = `${TEXT_SIZE_PX}px monospace`;
      ctx.textBaseline = 'top';
      let y = PANEL_MARGIN_PX + 3;
      for (const entry of lines) {
        line(entry.text, y, entry.warn ? WARN_COLOUR : TEXT_COLOUR);
        y += LINE_HEIGHT_PX;
      }
    },

    /**
     * Flip visibility.
     * @returns {boolean} The new visibility.
     */
    toggle() {
      visible = !visible;
      return visible;
    },

    /**
     * @param {boolean} value - Desired visibility.
     * @returns {void}
     */
    setVisible(value) {
      visible = Boolean(value);
    },

    /** @returns {boolean} Whether the overlay is currently drawn. */
    isVisible() {
      return visible;
    },
  };
}
