/**
 * Lightweight pub/sub event bus for decoupling systems (e.g. scoring
 * reacting to a bump-system kill event without a direct dependency).
 * @module core/events
 */

/**
 * Create an event bus.
 * @returns {{
 *   on: (event: string, handler: (payload?: object) => void) => void,
 *   off: (event: string, handler: (payload?: object) => void) => void,
 *   emit: (event: string, payload?: object) => void,
 * }}
 */
export function createEventBus() {
  throw new Error('not implemented');
}
