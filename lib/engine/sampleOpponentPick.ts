import type { DraftConfig, Position } from '../../constants/league';
import type { Player } from '../data/types';
import { countByPos, need, type RosterCounts } from './need';
import { roundOf } from './snakeMath';

export type Rng = () => number;

const POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];

const uniqueById = (players: Player[]): Player[] => {
  const seen = new Set<string>();
  const out: Player[] = [];
  for (const p of players) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
};

const top3Ids = (remaining: Player[]): Set<string> => {
  let a: Player | undefined;
  let b: Player | undefined;
  let c: Player | undefined;
  for (const pl of remaining) {
    if (!a || pl.overallRank < a.overallRank) {
      c = b;
      b = a;
      a = pl;
    } else if (!b || pl.overallRank < b.overallRank) {
      c = b;
      b = pl;
    } else if (!c || pl.overallRank < c.overallRank) {
      c = pl;
    }
  }
  const ids = new Set<string>();
  if (a) ids.add(a.id);
  if (b) ids.add(b.id);
  if (c) ids.add(c.id);
  return ids;
};

const lowestRankId = (candidates: Player[]): string => {
  let best = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i].overallRank < best.overallRank) best = candidates[i];
  }
  return best.id;
};

export const sampleOpponentPick = (args: {
  available: Player[];
  rosterIds: string[];
  playersById: Map<string, Player>;
  overall: number;
  cfg: DraftConfig;
  rng: Rng;
}): string => {
  const { available, rosterIds, playersById, overall: p, cfg, rng } = args;
  const rostered = new Set(rosterIds);
  const remaining = available.filter((pl) => !rostered.has(pl.id));
  if (remaining.length === 0) {
    throw new Error('sampleOpponentPick: no remaining players');
  }

  const top3 = top3Ids(remaining);
  const inAdpWindow = (pl: Player, slack: number) => pl.adp != null && pl.adp <= p + slack;

  let candidates = remaining.filter((pl) => inAdpWindow(pl, 10) || top3.has(pl.id));
  if (candidates.length < 5) {
    candidates = uniqueById([
      ...candidates,
      ...remaining.filter((pl) => pl.adp == null),
    ]);
  }
  if (candidates.length < 5) {
    candidates = remaining.filter(
      (pl) => inAdpWindow(pl, 20) || top3.has(pl.id) || pl.adp == null,
    );
  }
  if (candidates.length === 0) candidates = remaining;

  const counts = countByPos(rosterIds, playersById);
  const round = roundOf(p, cfg.teams);
  const needByPos = {} as Record<Position, number>;
  for (const pos of POSITIONS) needByPos[pos] = need(counts, pos, round, cfg);

  const weights = candidates.map((pl) => {
    const adp = pl.adp ?? p + 20;
    const sigma = pl.adp == null ? 15 : Math.max(pl.adpStdev ?? 3, 3);
    const gauss = Math.exp(-((adp - p) ** 2) / (2 * sigma ** 2));
    return gauss * needByPos[pl.position];
  });

  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) {
    return lowestRankId(candidates);
  }

  let r = rng() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i].id;
  }
  return candidates[candidates.length - 1].id;
};

const candIdx: number[] = [];
const candW: number[] = [];
const needByPosScratch = {} as Record<Position, number>;

/** Same roulette as sampleOpponentPick, over remaining board indices (no Player[] rebuild). */
export const sampleOpponentPickFromIdx = (args: {
  available: Player[];
  rem: Uint16Array;
  remLen: number;
  counts: RosterCounts;
  overall: number;
  round: number;
  cfg: DraftConfig;
  rng: Rng;
}): string => {
  const { available, rem, remLen, counts, overall: p, round, cfg, rng } = args;
  if (remLen === 0) {
    throw new Error('sampleOpponentPick: no remaining players');
  }

  let a = -1;
  let b = -1;
  let c = -1;
  let ar = Infinity;
  let br = Infinity;
  let cr = Infinity;
  for (let k = 0; k < remLen; k++) {
    const i = rem[k];
    const r = available[i].overallRank;
    if (r < ar) {
      c = b;
      cr = br;
      b = a;
      br = ar;
      a = i;
      ar = r;
    } else if (r < br) {
      c = b;
      cr = br;
      b = i;
      br = r;
    } else if (r < cr) {
      c = i;
      cr = r;
    }
  }

  const inAdpWindow = (pl: Player, slack: number) => pl.adp != null && pl.adp <= p + slack;
  const isTop3 = (i: number) => i === a || i === b || i === c;

  candIdx.length = 0;
  for (let k = 0; k < remLen; k++) {
    const i = rem[k];
    const pl = available[i];
    if (isTop3(i) || inAdpWindow(pl, 10)) candIdx.push(i);
  }
  if (candIdx.length < 5) {
    for (let k = 0; k < remLen; k++) {
      const i = rem[k];
      if (available[i].adp == null && !candIdx.includes(i)) candIdx.push(i);
    }
  }
  if (candIdx.length < 5) {
    candIdx.length = 0;
    for (let k = 0; k < remLen; k++) {
      const i = rem[k];
      const pl = available[i];
      if (isTop3(i) || inAdpWindow(pl, 20) || pl.adp == null) candIdx.push(i);
    }
  }
  if (candIdx.length === 0) {
    for (let k = 0; k < remLen; k++) candIdx.push(rem[k]);
  }

  const needByPos = needByPosScratch;
  for (const pos of POSITIONS) needByPos[pos] = need(counts, pos, round, cfg);

  candW.length = 0;
  let total = 0;
  for (const i of candIdx) {
    const pl = available[i];
    const adp = pl.adp ?? p + 20;
    const sigma = pl.adp == null ? 15 : Math.max(pl.adpStdev ?? 3, 3);
    const gauss = Math.exp(-((adp - p) ** 2) / (2 * sigma ** 2));
    const w = gauss * needByPos[pl.position];
    candW.push(w);
    total += w;
  }
  if (total <= 0) {
    let best = candIdx[0];
    let bestRank = available[best].overallRank;
    for (let n = 1; n < candIdx.length; n++) {
      const i = candIdx[n];
      if (available[i].overallRank < bestRank) {
        best = i;
        bestRank = available[i].overallRank;
      }
    }
    return available[best].id;
  }

  let r = rng() * total;
  for (let n = 0; n < candIdx.length; n++) {
    r -= candW[n];
    if (r <= 0) return available[candIdx[n]].id;
  }
  return available[candIdx[candIdx.length - 1]].id;
};

