import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_CONFIG } from '../../constants/league';
import type { Player } from '../data/types';
import { runSimulation } from './simulation';

const player = (
  id: string,
  pos: Player['position'],
  adp: number,
  overallRank: number,
  posRank = overallRank,
): Player => ({
  id,
  ffcId: null,
  name: id,
  searchKey: id,
  position: pos,
  team: 'KC',
  bye: 5,
  adp,
  adpStdev: 3,
  timesDrafted: 10,
  overallRank,
  posRank,
  injuryStatus: null,
  sleeperMatched: true,
});

const pool20 = (): Player[] => {
  const rb1 = player('rb1', 'RB', 1, 1, 1);
  const wr1 = player('wr1', 'WR', 2, 2, 1);
  const filler: Player[] = [];
  for (let i = 0; i < 18; i++) {
    const pos = i % 2 === 0 ? 'RB' : 'WR';
    filler.push(player(`f${i}`, pos, 200, 3 + i, 10 + i));
  }
  return [rb1, wr1, ...filler];
};

const elitePool = (): Player[] => {
  const rb1 = player('rb1', 'RB', 1, 1, 1);
  const wr1 = player('wr1', 'WR', 2, 2, 1);
  const filler: Player[] = [];
  for (let i = 0; i < 48; i++) {
    const pos = i % 2 === 0 ? 'RB' : 'WR';
    filler.push(player(`f${i}`, pos, 200, 3 + i, 10 + i));
  }
  return [rb1, wr1, ...filler];
};

const clusteredPool = (): Player[] => {
  const rbs = Array.from({ length: 20 }, (_, i) => player(`rb${i}`, 'RB', 16 + i, 10 + 2 * i, 1 + i));
  const wrs = Array.from({ length: 20 }, (_, i) => player(`wr${i}`, 'WR', 16 + i, 11 + 2 * i, 1 + i));
  const filler = Array.from({ length: 20 }, (_, i) =>
    player(`late${i}`, i % 2 === 0 ? 'TE' : 'QB', 200, 120 + i, 20 + i),
  );
  return [...rbs, ...wrs, ...filler];
};

test('runSimulation is deterministic for the same seed', () => {
  const available = elitePool();
  const args = {
    available,
    picks: [] as { overall: number; playerId: string }[],
    cfg: DEFAULT_CONFIG,
    rosters: new Map<number, string[]>(),
    fromOverall: 14,
    toOverall: 36,
    seed: 1,
  };
  const a = runSimulation(args);
  const b = runSimulation(args);
  assert.deepEqual(Object.fromEntries(a.survival), Object.fromEntries(b.survival));
});

test('elite ADP rarely survives; late ADP usually does', () => {
  const available = elitePool();
  const result = runSimulation({
    available,
    picks: [],
    cfg: DEFAULT_CONFIG,
    rosters: new Map(),
    fromOverall: 14,
    toOverall: 36,
    seed: 1,
  });
  assert.ok((result.survival.get('rb1') ?? 1) < 0.15);
  assert.ok((result.survival.get('f47') ?? 0) > 0.85);
});

test('RB-stacked opponents take fewer RBs than a WR-hungry field', () => {
  const available = clusteredPool();
  const extraRbs = Array.from({ length: 22 }, (_, i) => player(`stack-rb${i}`, 'RB', 50 + i, 100 + i, 20 + i));
  const extraWrs = Array.from({ length: 22 }, (_, i) => player(`stack-wr${i}`, 'WR', 50 + i, 200 + i, 20 + i));
  const rbRosters = new Map<number, string[]>();
  const wrRosters = new Map<number, string[]>();
  for (let slot = 1; slot <= 11; slot++) {
    rbRosters.set(slot, [extraRbs[(slot - 1) * 2].id, extraRbs[(slot - 1) * 2 + 1].id]);
    wrRosters.set(slot, [extraWrs[(slot - 1) * 2].id, extraWrs[(slot - 1) * 2 + 1].id]);
  }
  const stacked = runSimulation({
    available: [...available, ...extraRbs],
    picks: [],
    cfg: DEFAULT_CONFIG,
    rosters: rbRosters,
    fromOverall: 14,
    toOverall: 36,
    seed: 1,
  });
  const hungry = runSimulation({
    available: [...available, ...extraWrs],
    picks: [],
    cfg: DEFAULT_CONFIG,
    rosters: wrRosters,
    fromOverall: 14,
    toOverall: 36,
    seed: 1,
  });
  const clusteredRbIds = available.filter((p) => p.id.startsWith('rb')).map((p) => p.id);
  const rbTaken = (run: typeof stacked) =>
    clusteredRbIds.reduce((s, id) => s + (1 - (run.survival.get(id) ?? 1)), 0);
  const stackedTaken = rbTaken(stacked);
  const hungryTaken = rbTaken(hungry);
  assert.ok(
    stackedTaken < 0.85 * hungryTaken,
    `stacked ${stackedTaken} vs hungry ${hungryTaken}`,
  );
});

test('duplicate playerId in picks degrades', () => {
  const available = pool20();
  const result = runSimulation({
    available,
    picks: [
      { overall: 1, playerId: 'rb1' },
      { overall: 2, playerId: 'rb1' },
    ],
    cfg: DEFAULT_CONFIG,
    rosters: new Map(),
    fromOverall: 14,
    toOverall: 36,
    seed: 1,
  });
  assert.equal(result.degraded, true);
});

test('a hole in picks does not degrade', () => {
  const available = pool20();
  const result = runSimulation({
    available,
    picks: [
      { overall: 1, playerId: 'f0' },
      { overall: 3, playerId: 'f1' },
    ],
    cfg: DEFAULT_CONFIG,
    rosters: new Map(),
    fromOverall: 14,
    toOverall: 36,
    seed: 1,
  });
  assert.equal(result.degraded, false);
});
