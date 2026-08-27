import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_CONFIG } from '../../constants/league';
import type { RosterCounts } from './need';
import { need } from './need';

const empty = (): RosterCounts => ({ QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 });

test('unfilled dedicated RB is 1.0', () => {
  assert.equal(need(empty(), 'RB', 1, DEFAULT_CONFIG), 1.0);
});

test('third QB is over-cap 0.02', () => {
  const counts = { ...empty(), QB: 2 };
  assert.equal(need(counts, 'QB', 5, DEFAULT_CONFIG), 0.02);
});

test('K with no starter in round 10 is dedicated 1.0', () => {
  assert.equal(need(empty(), 'K', 10, DEFAULT_CONFIG), 1.0);
});

test('K with a starter already in round 10 is over-cap 0.02', () => {
  const counts = { ...empty(), K: 1 };
  assert.equal(need(counts, 'K', 10, DEFAULT_CONFIG), 0.02);
});

test('RB at dedicated starters with flex still open is 0.7', () => {
  const counts = { ...empty(), RB: 2, WR: 3, TE: 1 };
  assert.equal(need(counts, 'RB', 6, DEFAULT_CONFIG), 0.7);
});
