import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_CONFIG } from '../../constants/league';
import {
  isFirstOfPair,
  overallFor,
  roundOf,
  slotOnClock,
  survivalHorizon,
  userPicks,
} from './snakeMath';

test('round-trips all 180 overalls for 12 teams', () => {
  for (let o = 1; o <= 180; o++) {
    const r = roundOf(o, 12);
    const s = slotOnClock(o, 12);
    assert.equal(overallFor(r, s, 12), o);
  }
});

test('slot-12 user picks include 180 not 179', () => {
  assert.deepEqual(
    userPicks(DEFAULT_CONFIG),
    [12, 13, 36, 37, 60, 61, 84, 85, 108, 109, 132, 133, 156, 157, 180],
  );
});

test('isFirstOfPair only on the first of consecutive user overalls', () => {
  assert.equal(isFirstOfPair(12, DEFAULT_CONFIG), true);
  assert.equal(isFirstOfPair(13, DEFAULT_CONFIG), false);
  assert.equal(isFirstOfPair(156, DEFAULT_CONFIG), true);
  assert.equal(isFirstOfPair(157, DEFAULT_CONFIG), false);
  assert.equal(isFirstOfPair(180, DEFAULT_CONFIG), false);
});

test('survivalHorizon skips the consecutive pair pick', () => {
  assert.equal(survivalHorizon(12, DEFAULT_CONFIG), 36);
  assert.equal(survivalHorizon(13, DEFAULT_CONFIG), 36);
  assert.equal(survivalHorizon(157, DEFAULT_CONFIG), 180);
  assert.equal(survivalHorizon(180, DEFAULT_CONFIG), null);
});

test('10-team slot-3 parameterized', () => {
  const cfg = { ...DEFAULT_CONFIG, teams: 10, userSlot: 3 };
  assert.equal(overallFor(1, 3, 10), 3);
  assert.equal(overallFor(2, 3, 10), 18);
  assert.equal(overallFor(3, 3, 10), 23);
  assert.equal(userPicks(cfg).length, 15);
});
