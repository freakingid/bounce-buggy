/**
 * Generic finite state machine helper, used by the player, enemy AI, and
 * game state modules.
 * @module core/stateMachine
 */

/**
 * Create a state machine instance.
 * @param {{ initial: string, states: Record<string, object> }} config
 * @returns {{ state: string, send: (event: string, payload?: object) => void }}
 */
export function createStateMachine(config) {
  throw new Error('not implemented');
}
