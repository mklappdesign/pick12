import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_CONFIG } from '../../constants/league';
import type { Player } from '../data/types';
import { mulberry32 } from './rng';
import { sampleOpponentPick } from './sampleOpponentPick';

const player = (id: string, pos: Player['position'], adp: number, overallRank: number): Player => ({
  id,
  ffcId: null,
  name: id,
  searchKey: id,
  position: pos,
  team: 'KC',
  bye: 5,
  adp,
  adpStdev: 4,
  timesDrafted: 10,
  overallRank,
  posRank: overallRank,
  injuryStatus: null,
  sleeperMatched: true,
});

test('RB-full roster draws WR more often than RB', () => {
  const rbs = Array.from({ length: 5 }, (_, i) => player(`rb${i}`, 'RB', 20 + i, 20 + i));
  const wrs = Array.from({ length: 5 }, (_, i) => player(`wr${i}`, 'WR', 21 + i, 30 + i));
  const available = [...rbs.slice(2), ...wrs];
  const playersById = new Map([...rbs, ...wrs].map((p) => [p.id, p]));
  const rosterIds = ['rb0', 'rb1'];
  const rng = mulberry32(1);
  let wrDraws = 0;
  const n = 2000;
  for (let i = 0; i < n; i++) {
    const id = sampleOpponentPick({
      available,
      rosterIds,
      playersById,
      overall: 24,
      cfg: DEFAULT_CONFIG,
      rng,
    });
    if (id.startsWith('wr')) wrDraws += 1;
  }
  assert.ok(wrDraws > n / 2, `expected WR majority, got ${wrDraws}/${n}`);
});
