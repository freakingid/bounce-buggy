/**
 * Event bus tests. The bus carries audio cues and cross-system notifications
 * from Phase 10 onward, where handlers unsubscribing during dispatch is
 * normal, so that case is covered explicitly.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createEventBus } from '../src/core/events.js';

test('createEventBus', async (t) => {
  await t.test('a handler receives emitted payloads', () => {
    const bus = createEventBus();
    const seen = [];
    bus.on('kill', (payload) => seen.push(payload));
    bus.emit('kill', { points: 200 });
    assert.deepEqual(seen, [{ points: 200 }]);
  });

  await t.test('handlers run in subscription order', () => {
    const bus = createEventBus();
    const order = [];
    bus.on('tick', () => order.push('a'));
    bus.on('tick', () => order.push('b'));
    bus.emit('tick');
    assert.deepEqual(order, ['a', 'b']);
  });

  await t.test('emitting an event with no subscribers is a no-op', () => {
    const bus = createEventBus();
    assert.doesNotThrow(() => bus.emit('nobody-listening', {}));
  });

  await t.test('off removes a handler', () => {
    const bus = createEventBus();
    let count = 0;
    const handler = () => { count += 1; };
    bus.on('crash', handler);
    bus.emit('crash');
    bus.off('crash', handler);
    bus.emit('crash');
    assert.equal(count, 1);
  });

  await t.test('on returns a working unsubscribe function', () => {
    const bus = createEventBus();
    let count = 0;
    const unsubscribe = bus.on('crash', () => { count += 1; });
    bus.emit('crash');
    unsubscribe();
    bus.emit('crash');
    assert.equal(count, 1);
  });

  await t.test('off on an unknown event or handler is harmless', () => {
    const bus = createEventBus();
    assert.doesNotThrow(() => bus.off('nope', () => {}));
    bus.on('yes', () => {});
    assert.doesNotThrow(() => bus.off('yes', () => {}));
    assert.equal(bus.listenerCount('yes'), 1);
  });

  await t.test('a handler may unsubscribe itself during dispatch', () => {
    const bus = createEventBus();
    const order = [];
    const first = () => {
      order.push('first');
      bus.off('cue', first);
    };
    bus.on('cue', first);
    bus.on('cue', () => order.push('second'));

    bus.emit('cue');
    bus.emit('cue');
    assert.deepEqual(order, ['first', 'second', 'second']);
  });

  await t.test('a handler subscribed during dispatch is not called by that same emit', () => {
    const bus = createEventBus();
    const order = [];
    bus.on('cue', () => {
      order.push('outer');
      bus.on('cue', () => order.push('inner'));
    });
    bus.emit('cue');
    assert.deepEqual(order, ['outer']);
  });

  await t.test('once fires exactly one time', () => {
    const bus = createEventBus();
    let count = 0;
    bus.once('boot', () => { count += 1; });
    bus.emit('boot');
    bus.emit('boot');
    assert.equal(count, 1);
    assert.equal(bus.listenerCount('boot'), 0);
  });

  await t.test('events are independent of one another', () => {
    const bus = createEventBus();
    let a = 0;
    let b = 0;
    bus.on('a', () => { a += 1; });
    bus.on('b', () => { b += 1; });
    bus.emit('a');
    assert.equal(a, 1);
    assert.equal(b, 0);
  });

  await t.test('clear removes one event or the whole bus', () => {
    const bus = createEventBus();
    bus.on('a', () => {});
    bus.on('b', () => {});
    bus.clear('a');
    assert.equal(bus.listenerCount('a'), 0);
    assert.equal(bus.listenerCount('b'), 1);
    bus.clear();
    assert.equal(bus.listenerCount('b'), 0);
  });
});
