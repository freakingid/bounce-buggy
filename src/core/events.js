/**
 * Lightweight pub/sub event bus for decoupling systems (e.g. scoring
 * reacting to a bump-system kill event without a direct dependency).
 *
 * Handlers run synchronously in subscription order. Emission iterates a copy
 * of the handler list, so a handler may subscribe or unsubscribe during
 * dispatch without corrupting the in-flight iteration — the audio cue layer
 * will do exactly that for one-shot cues.
 * @module core/events
 */

/**
 * Create an event bus.
 * @returns {{
 *   on: (event: string, handler: (payload?: object) => void) => () => void,
 *   off: (event: string, handler: (payload?: object) => void) => void,
 *   once: (event: string, handler: (payload?: object) => void) => () => void,
 *   emit: (event: string, payload?: object) => void,
 *   clear: (event?: string) => void,
 *   listenerCount: (event: string) => number,
 * }}
 */
export function createEventBus() {
  /** @type {Map<string, Array<Function>>} */
  const handlers = new Map();

  /**
   * Subscribe to an event.
   * @param {string} event - Event name.
   * @param {(payload?: object) => void} handler - Called on each emit.
   * @returns {() => void} Unsubscribe function.
   */
  function on(event, handler) {
    const list = handlers.get(event);
    if (list) {
      list.push(handler);
    } else {
      handlers.set(event, [handler]);
    }
    return () => off(event, handler);
  }

  /**
   * Unsubscribe a handler. Removes one registration; a handler subscribed
   * twice stays subscribed once.
   * @param {string} event - Event name.
   * @param {(payload?: object) => void} handler - The handler passed to `on`.
   * @returns {void}
   */
  function off(event, handler) {
    const list = handlers.get(event);
    if (!list) return;
    const index = list.indexOf(handler);
    if (index !== -1) list.splice(index, 1);
    if (list.length === 0) handlers.delete(event);
  }

  /**
   * Subscribe to the next emission only.
   * @param {string} event - Event name.
   * @param {(payload?: object) => void} handler - Called once, then removed.
   * @returns {() => void} Unsubscribe function.
   */
  function once(event, handler) {
    /**
     * @param {object} [payload] - Forwarded payload.
     * @returns {void}
     */
    const wrapper = (payload) => {
      off(event, wrapper);
      handler(payload);
    };
    return on(event, wrapper);
  }

  /**
   * Emit an event to all current subscribers.
   * @param {string} event - Event name.
   * @param {object} [payload] - Passed to each handler.
   * @returns {void}
   */
  function emit(event, payload) {
    const list = handlers.get(event);
    if (!list || list.length === 0) return;
    // Copy: a handler is allowed to unsubscribe itself mid-dispatch.
    for (const handler of list.slice()) {
      handler(payload);
    }
  }

  /**
   * Remove all handlers for one event, or for every event.
   * @param {string} [event] - Event name; omit to clear the whole bus.
   * @returns {void}
   */
  function clear(event) {
    if (event === undefined) {
      handlers.clear();
    } else {
      handlers.delete(event);
    }
  }

  /**
   * @param {string} event - Event name.
   * @returns {number} Number of handlers currently subscribed.
   */
  function listenerCount(event) {
    return handlers.get(event)?.length ?? 0;
  }

  return { on, off, once, emit, clear, listenerCount };
}
