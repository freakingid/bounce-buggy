import { test } from 'node:test';
import assert from 'node:assert/strict';
import { create } from '../src/core/rng.js';

test('identical seeds produce identical sequences', () => {
  const a = create(12345);
  const b = create(12345);
  const seqA = Array.from({ length: 50 }, () => a.next());
  const seqB = Array.from({ length: 50 }, () => b.next());
  assert.deepEqual(seqA, seqB);
});

test('different seeds produce different sequences', () => {
  const a = create(1);
  const b = create(2);
  const seqA = Array.from({ length: 20 }, () => a.next());
  const seqB = Array.from({ length: 20 }, () => b.next());
  assert.notDeepEqual(seqA, seqB);
});

test('next() stays within [0, 1)', () => {
  const rng = create(999);
  for (let i = 0; i < 10000; i++) {
    const value = rng.next();
    assert.ok(value >= 0 && value < 1, `value ${value} out of range`);
  }
});

test('nextInt() stays within [min, max] inclusive and hits both bounds', () => {
  const rng = create(42);
  const min = 3;
  const max = 7;
  const seen = new Set();
  for (let i = 0; i < 5000; i++) {
    const value = rng.nextInt(min, max);
    assert.ok(Number.isInteger(value), `value ${value} is not an integer`);
    assert.ok(value >= min && value <= max, `value ${value} out of range`);
    seen.add(value);
  }
  assert.ok(seen.has(min), 'never produced the minimum bound');
  assert.ok(seen.has(max), 'never produced the maximum bound');
});

test('snapshot/restore replays the same continuation', () => {
  const rng = create(2026);
  // Advance a bit before snapshotting.
  for (let i = 0; i < 7; i++) rng.next();

  const snapshot = rng.snapshot();
  const continuation = Array.from({ length: 30 }, () => rng.next());

  rng.restore(snapshot);
  const replay = Array.from({ length: 30 }, () => rng.next());

  assert.deepEqual(replay, continuation);
});

test('restore does not affect a separately-created instance', () => {
  const source = create(7);
  source.next();
  source.next();
  const snapshot = source.snapshot();

  const other = create(1000);
  const beforeRestore = other.next();
  other.restore(snapshot);
  const afterRestore = other.next();

  assert.notEqual(beforeRestore, afterRestore);
});
