import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_CONFIG } from '../../constants/league';
import type { Position } from '../../constants/league';
import type { Player } from '../data/types';
import { deriveBaselines } from './baselines';
import type { RosterCounts } from './need';
import { recommendPair, recommendSingle, type Rec } from './recommend';
import { reasonText } from './reasonText';
import type { ExpBest } from './simulation';

const player = (
  id: string,
  pos: Player['position'],
  adp: number | null,
  overallRank: number,
  posRank: number,
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

const empty = (): RosterCounts => ({ QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 });

const zeroExp = (): Record<Position, ExpBest> => ({
  QB: { proj: 0, vorp: 0 },
  RB: { proj: 0, vorp: 0 },
  WR: { proj: 0, vorp: 0 },
  TE: { proj: 0, vorp: 0 },
  K: { proj: 0, vorp: 0 },
  DST: { proj: 0, vorp: 0 },
});

test('regret prefers scarce position when WR remaining collapses', () => {
  const wr = player('wr1', 'WR', 20, 10, 8);
  const rb = player('rb1', 'RB', 20, 11, 8);
  const baselines = deriveBaselines(DEFAULT_CONFIG);
  const expBestByPos = zeroExp();
  expBestByPos.WR = { proj: 50, vorp: -20 };
  expBestByPos.RB = { proj: 250, vorp: 80 };
  const recs = recommendSingle({
    available: [wr, rb],
    userCounts: empty(),
    cfg: DEFAULT_CONFIG,
    overall: 12,
    baselines,
    sim: {
      survival: new Map([
        ['wr1', 0.4],
        ['rb1', 0.4],
      ]),
      expBestByPos,
    },
  });
  assert.equal(recs[0]?.player.id, 'wr1');
});

test('constructed cliff: elite WR+RB beats two WRs when RB remaining collapses', () => {
  const wr1 = player('wr1', 'WR', 5, 1, 1);
  const wr2 = player('wr2', 'WR', 6, 2, 2);
  const wr3 = player('wr3', 'WR', 30, 20, 12);
  const rb1 = player('rb1', 'RB', 8, 3, 12);
  const rb2 = player('rb2', 'RB', 40, 30, 24);
  const rb3 = player('rb3', 'RB', 50, 40, 30);
  const te1 = player('te1', 'TE', 60, 50, 8);
  const qb1 = player('qb1', 'QB', 70, 60, 8);
  const baselines = deriveBaselines(DEFAULT_CONFIG);
  const expBestByPos = zeroExp();
  expBestByPos.WR = { proj: 250, vorp: 80 };
  expBestByPos.RB = { proj: 90, vorp: -30 };
  const result = recommendPair({
    available: [wr1, wr2, wr3, rb1, rb2, rb3, te1, qb1],
    userCounts: { ...empty(), WR: 2, RB: 1 },
    cfg: DEFAULT_CONFIG,
    overall: 12,
    baselines,
    sim: {
      survival: new Map([
        ['wr1', 0.12],
        ['wr2', 0.2],
        ['wr3', 0.5],
        ['rb1', 0.35],
        ['rb2', 0.7],
        ['rb3', 0.8],
        ['te1', 0.9],
        ['qb1', 0.9],
      ]),
      expBestByPos,
    },
  });
  const ids = new Set(result.pair.map((p) => p.id));
  assert.ok(ids.has('wr1') && ids.has('rb1'), `pair was ${[...ids].join(',')}`);
  const shown = result.recs[0]?.reason.match(/\+(\d+) points/)?.[1];
  assert.ok(shown, `reason missing +N points: ${result.recs[0]?.reason}`);
  const n = Number(shown);
  assert.notEqual(n, Math.round(Math.abs(result.score)));
  assert.ok(n < Math.round(Math.abs(result.score)), `margin ${n} vs score ${result.score}`);
});

test('K/DST absent from recommendSingle at round 13 and present at round 14', () => {
  const rb = player('rb1', 'RB', 150, 140, 40);
  const k = player('k1', 'K', 160, 150, 1);
  const dst = player('dst1', 'DST', 165, 155, 1);
  const baselines = deriveBaselines(DEFAULT_CONFIG);
  const args = {
    available: [rb, k, dst],
    userCounts: empty(),
    cfg: DEFAULT_CONFIG,
    baselines,
    sim: null as null,
  };
  const round13 = recommendSingle({ ...args, overall: 156 });
  assert.equal(
    round13.some((r) => r.player.position === 'K' || r.player.position === 'DST'),
    false,
  );
  const round14 = recommendSingle({ ...args, overall: 157 });
  assert.ok(round14.some((r) => r.player.id === 'k1'));
  assert.ok(round14.some((r) => r.player.id === 'dst1'));
});

test('reasonText for a pair includes safe and a survival percent', () => {
  const rec: Rec = {
    player: player('wr1', 'WR', 5, 1, 1),
    score: 40,
    survival: 0.12,
    reason: '',
  };
  const text = reasonText(rec, { pairNow: true, pairSafe: true, delta: 18 });
  assert.match(text, /safe/i);
  assert.match(text, /12%/);
});
