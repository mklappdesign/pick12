import type { DraftConfig, Position } from '../../constants/league';
import type { Player } from '../data/types';
import { adpOnlySurvival } from './adpOnlySurvival';
import { deriveBaselines } from './baselines';
import { projectPoints } from './projections';
import { countByPos, type RosterCounts } from './need';
import { mulberry32 } from './rng';
import { sampleOpponentPickFromIdx } from './sampleOpponentPick';
import { roundOf, slotOnClock } from './snakeMath';
import { vorp } from './vorp';

export type ExpBest = { proj: number; vorp: number };

const POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];

const emptyExpBest = (): Record<Position, ExpBest> => {
  const out = {} as Record<Position, ExpBest>;
  for (const pos of POSITIONS) out[pos] = { proj: 0, vorp: 0 };
  return out;
};

const boardCorrupt = (
  picks: { overall: number; playerId: string }[],
  availableIds: Set<string>,
): boolean => {
  const seenOverall = new Set<number>();
  const seenPlayer = new Set<string>();
  for (const pick of picks) {
    if (seenOverall.has(pick.overall) || seenPlayer.has(pick.playerId)) return true;
    seenOverall.add(pick.overall);
    seenPlayer.add(pick.playerId);
  }
  for (const pick of picks) {
    if (!availableIds.has(pick.playerId)) return true;
  }
  return false;
};

const snapshotExpBest = (
  available: Player[],
  taken: Uint8Array,
  baselines: Record<Position, number>,
  dest: Record<Position, ExpBest>,
): Record<Position, ExpBest> => {
  for (const pos of POSITIONS) {
    dest[pos].proj = 0;
    dest[pos].vorp = 0;
  }
  for (let i = 0; i < available.length; i++) {
    if (taken[i]) continue;
    const p = available[i];
    const proj = projectPoints(p.position, p.posRank);
    const v = vorp(p.position, p.posRank, baselines);
    const cur = dest[p.position];
    if (proj > cur.proj) cur.proj = proj;
    if (v > cur.vorp) cur.vorp = v;
  }
  return dest;
};

export const runSimulation = (args: {
  available: Player[];
  picks: { overall: number; playerId: string }[];
  cfg: DraftConfig;
  rosters: Map<number, string[]>;
  fromOverall: number;
  toOverall: number;
  seed: number;
  sims?: number;
}): {
  survival: Map<string, number>;
  expBestByPos: Record<Position, ExpBest>;
  degraded: boolean;
} => {
  const { available, picks, cfg, rosters, fromOverall, toOverall, seed } = args;
  const requestedSims = args.sims ?? 200;
  const availableIds = new Set(available.map((p) => p.id));
  const idToIndex = new Map(available.map((p, i) => [p.id, i]));
  const playersById = new Map(available.map((p) => [p.id, p]));
  const baselines = deriveBaselines(cfg);

  const initialTaken = new Uint8Array(available.length);
  for (const pick of picks) {
    const idx = idToIndex.get(pick.playerId);
    if (idx !== undefined) initialTaken[idx] = 1;
  }
  for (const ids of rosters.values()) {
    for (const id of ids) {
      const idx = idToIndex.get(id);
      if (idx !== undefined) initialTaken[idx] = 1;
    }
  }

  const degraded = boardCorrupt(picks, availableIds);
  if (degraded) {
    const survival = new Map<string, number>();
    for (const p of available) {
      survival.set(p.id, adpOnlySurvival(p.adp, toOverall, p.adpStdev));
    }
    return {
      survival,
      expBestByPos: snapshotExpBest(available, initialTaken, baselines, emptyExpBest()),
      degraded: true,
    };
  }

  const opponentOveralls: number[] = [];
  const pickOveralls = new Set(picks.map((p) => p.overall));
  for (let o = fromOverall; o <= toOverall - 1; o++) {
    if (pickOveralls.has(o)) continue;
    if (slotOnClock(o, cfg.teams) === cfg.userSlot) continue;
    opponentOveralls.push(o);
  }

  const rng = mulberry32(seed);
  const survivalCounts = new Float64Array(available.length);
  const expProj = emptyExpBest();
  const expVorp = emptyExpBest();
  const bestScratch = emptyExpBest();
  const live: number[] = [];
  for (let i = 0; i < available.length; i++) {
    if (!initialTaken[i]) live.push(i);
  }
  const rem = new Uint16Array(available.length);
  const loc = new Int32Array(available.length);
  const taken = new Uint8Array(available.length);
  const oppSlots = opponentOveralls.map((o) => slotOnClock(o, cfg.teams));
  const oppRounds = opponentOveralls.map((o) => roundOf(o, cfg.teams));
  const teamCount = cfg.teams;
  const emptyCounts = (): RosterCounts => ({ QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 });
  const baseCounts: RosterCounts[] = Array.from({ length: teamCount + 1 }, () => emptyCounts());
  for (const [slot, ids] of rosters) baseCounts[slot] = countByPos(ids, playersById);
  const workCounts: RosterCounts[] = Array.from({ length: teamCount + 1 }, () => emptyCounts());
  const start = Date.now();
  let planned = requestedSims;
  let completed = 0;

  for (let s = 0; s < planned; s++) {
    if (s === Math.floor(requestedSims / 2) && Date.now() - start > 80) {
      planned = Math.min(planned, 250);
      if (s >= planned) break;
    }

    taken.set(initialTaken);
    for (let slot = 1; slot <= teamCount; slot++) {
      const src = baseCounts[slot];
      const dst = workCounts[slot];
      dst.QB = src.QB;
      dst.RB = src.RB;
      dst.WR = src.WR;
      dst.TE = src.TE;
      dst.K = src.K;
      dst.DST = src.DST;
    }

    let remLen = live.length;
    for (let k = 0; k < remLen; k++) {
      rem[k] = live[k];
      loc[live[k]] = k;
    }

    for (let oi = 0; oi < opponentOveralls.length; oi++) {
      if (remLen === 0) break;
      const counts = workCounts[oppSlots[oi]];
      const pickedId = sampleOpponentPickFromIdx({
        available,
        rem,
        remLen,
        counts,
        overall: opponentOveralls[oi],
        round: oppRounds[oi],
        cfg,
        rng,
      });
      const idx = idToIndex.get(pickedId);
      if (idx === undefined) continue;
      taken[idx] = 1;
      counts[available[idx].position] += 1;
      const at = loc[idx];
      remLen -= 1;
      const last = rem[remLen];
      if (at !== remLen) {
        rem[at] = last;
        loc[last] = at;
      }
    }

    for (let i = 0; i < available.length; i++) {
      if (!taken[i]) survivalCounts[i] += 1;
    }
    snapshotExpBest(available, taken, baselines, bestScratch);
    for (const pos of POSITIONS) {
      expProj[pos].proj += bestScratch[pos].proj;
      expVorp[pos].vorp += bestScratch[pos].vorp;
    }
    completed += 1;
  }

  const n = Math.max(completed, 1);
  const survival = new Map<string, number>();
  for (let i = 0; i < available.length; i++) {
    survival.set(available[i].id, survivalCounts[i] / n);
  }
  const expBestByPos = emptyExpBest();
  for (const pos of POSITIONS) {
    expBestByPos[pos] = { proj: expProj[pos].proj / n, vorp: expVorp[pos].vorp / n };
  }

  return { survival, expBestByPos, degraded: false };
};
