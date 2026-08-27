import type { DraftConfig, Position } from '../../constants/league';
import type { Player } from '../data/types';
import { adpOnlySurvival } from './adpOnlySurvival';
import { deriveBaselines } from './baselines';
import { projectPoints } from './projections';
import { mulberry32 } from './rng';
import { sampleOpponentPick } from './sampleOpponentPick';
import { slotOnClock } from './snakeMath';
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
): Record<Position, ExpBest> => {
  const best = emptyExpBest();
  for (let i = 0; i < available.length; i++) {
    if (taken[i]) continue;
    const p = available[i];
    const proj = projectPoints(p.position, p.posRank);
    const v = vorp(p.position, p.posRank, baselines);
    const cur = best[p.position];
    if (proj > cur.proj) cur.proj = proj;
    if (v > cur.vorp) cur.vorp = v;
  }
  return best;
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
  const requestedSims = args.sims ?? 500;
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
      expBestByPos: snapshotExpBest(available, initialTaken, baselines),
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
  const remainingBuf: Player[] = [];
  const start = Date.now();
  let planned = requestedSims;
  let completed = 0;

  for (let s = 0; s < planned; s++) {
    if (s === Math.floor(requestedSims / 2) && Date.now() - start > 80) {
      planned = 250;
      if (s >= 250) break;
    }

    const taken = new Uint8Array(initialTaken);
    const simRosters = new Map<number, string[]>();
    for (const [slot, ids] of rosters) simRosters.set(slot, ids.slice());

    for (const o of opponentOveralls) {
      remainingBuf.length = 0;
      for (let i = 0; i < available.length; i++) {
        if (!taken[i]) remainingBuf.push(available[i]);
      }
      if (remainingBuf.length === 0) break;
      const slot = slotOnClock(o, cfg.teams);
      const rosterIds = simRosters.get(slot) ?? [];
      if (!simRosters.has(slot)) simRosters.set(slot, rosterIds);
      const pickedId = sampleOpponentPick({
        available: remainingBuf,
        rosterIds,
        playersById,
        overall: o,
        cfg,
        rng,
      });
      const idx = idToIndex.get(pickedId);
      if (idx === undefined) continue;
      taken[idx] = 1;
      rosterIds.push(pickedId);
    }

    for (let i = 0; i < available.length; i++) {
      if (!taken[i]) survivalCounts[i] += 1;
    }
    const best = snapshotExpBest(available, taken, baselines);
    for (const pos of POSITIONS) {
      expProj[pos].proj += best[pos].proj;
      expVorp[pos].vorp += best[pos].vorp;
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
