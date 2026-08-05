/**
 * Keyboard + Gamepad API input, mapped to an abstract input state. Handles
 * simultaneous key rollover so "accelerate + steer" works together.
 * @module core/input
 */

/**
 * Create an input state tracker.
 * @returns {{ read: () => object }}
 */
export function createInputState() {
  throw new Error('not implemented — see Phase 1');
}
