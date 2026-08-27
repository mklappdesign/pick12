import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_CONFIG } from '../constants/league';

test('default league is 12-team 15-round PPR from slot 12', () => {
  assert.equal(DEFAULT_CONFIG.teams, 12);
  assert.equal(DEFAULT_CONFIG.userSlot, 12);
  assert.equal(DEFAULT_CONFIG.rounds, 15);
  assert.equal(DEFAULT_CONFIG.scoring, 'ppr');
  assert.equal(DEFAULT_CONFIG.starters.WR, 3);
  assert.equal(DEFAULT_CONFIG.starters.FLEX, 1);
  assert.equal(DEFAULT_CONFIG.bench, 5);
});
