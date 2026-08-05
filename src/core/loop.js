/**
 * Fixed-timestep game loop, decoupled from requestAnimationFrame per
 * CLAUDE.md §2.5. Simulation steps run at a fixed rate; rendering may
 * interpolate between steps but must never drive simulation state.
 * @module core/loop
 */

/**
 * Create a fixed-timestep loop.
 * @param {{ update: (dt: number) => void, render: (alpha: number) => void }} config
 * @returns {{ start: () => void, stop: () => void }}
 */
export function createLoop(config) {
  throw new Error('not implemented — see Phase 1');
}
