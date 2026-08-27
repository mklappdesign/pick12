import assert from 'node:assert/strict';
import test from 'node:test';
import type { Player } from '../data/types';
import { buildTiers, tierCliff } from './tiers';

const wr = (id: string, posRank: number): Player => ({
  id,
  ffcId: null,
  name: id,
  searchKey: id,
  position: 'WR',
  team: 'CIN',
  bye: 6,
  adp: posRank,
  adpStdev: 1,
  timesDrafted: 1,
  overallRank: posRank,
  posRank,
  injuryStatus: null,
  sleeperMatched: true,
});

test('a 40+ point first gap splits a lone elite off the rest', () => {
  const available = [wr('elite', 2), wr('d1', 40), wr('d2', 41), wr('d3', 42)];
  const bands = buildTiers(available).get('WR') ?? [];
  assert.equal(bands.length, 2);
  assert.deepEqual(bands[0].playerIds, ['elite']);
  assert.equal(bands[0].cliff, true);
});

test('two large WR gaps produce exactly 3 tiers', () => {
  const available = [
    wr('a', 1),
    wr('b', 2),
    wr('c', 3),
    wr('d', 40),
    wr('e', 41),
    wr('f', 42),
    wr('g', 43),
    wr('h', 44),
    wr('i', 80),
    wr('j', 81),
  ];
  const bands = buildTiers(available).get('WR') ?? [];
  assert.equal(bands.length, 3);
});

test('cliff is true at remaining 2, not 3', () => {
  const available = [
    wr('a', 1),
    wr('b', 2),
    wr('c', 3),
    wr('d', 40),
    wr('e', 41),
    wr('f', 42),
    wr('g', 43),
    wr('h', 44),
    wr('i', 80),
    wr('j', 81),
  ];
  const bands = buildTiers(available).get('WR') ?? [];
  assert.equal(bands.length, 3);
  const with3 = bands.find((b) => b.playerIds.length === 3);
  const with2 = bands.find((b) => b.playerIds.length === 2);
  assert.ok(with3);
  assert.ok(with2);
  assert.equal(tierCliff(with3!), false);
  assert.equal(with3!.cliff, false);
  assert.equal(tierCliff(with2!), true);
  assert.equal(with2!.cliff, true);
});
