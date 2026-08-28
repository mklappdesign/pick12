import type { Position } from '../../constants/league';
import type { Player, Snapshot } from '../data/types';
import { deriveBaselines } from '../engine/baselines';
import { countByPos } from '../engine/need';
import { recommendPair, recommendSingle, type Rec } from '../engine/recommend';
import { runSimulation } from '../engine/simulation';
import {
  isFirstOfPair,
  nextUserPick as nextUserPickOf,
  slotOnClock,
  survivalHorizon as survivalHorizonOf,
} from '../engine/snakeMath';
import { buildTiers, type TierBand } from '../engine/tiers';
import type { DraftState } from './draftTypes';
import { nextOverall } from './draftTypes';

export type EngineState = {
  available: Player[];
  rosters: Map<number, string[]>;
  baselines: Record<Position, number>;
  tiers: Map<Position, TierBand[]>;
  sim: ReturnType<typeof runSimulation> | null;
  recommendations: Rec[];
  pair: ReturnType<typeof recommendPair> | null;
  onClock: { overall: number; teamSlot: number };
  nextUserPick: number | null;
  survivalHorizon: number | null;
  cliffs: TierBand[];
};

export const djb2 = (s: string): number => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return h >>> 0;
};

let cache: { key: string; value: EngineState } | null = null;

const foldRosters = (draft: DraftState): Map<number, string[]> => {
  const rosters = new Map<number, string[]>();
  for (const pick of draft.picks) {
    const bag = rosters.get(pick.teamSlot) ?? [];
    bag.push(pick.playerId);
    rosters.set(pick.teamSlot, bag);
  }
  return rosters;
};

const cacheKey = (snapshot: Snapshot, draft: DraftState): string => {
  const last = draft.picks[draft.picks.length - 1]?.playerId ?? '';
  return [
    snapshot.fetchedAt,
    nextOverall(draft.picks),
    last,
    draft.revision,
    JSON.stringify(draft.config),
  ].join('|');
};

export const computeEngineState = (snapshot: Snapshot, draft: DraftState): EngineState => {
  const key = cacheKey(snapshot, draft);
  if (cache && cache.key === key) return cache.value;

  const cfg = draft.config;
  const total = cfg.teams * cfg.rounds;
  const overall = nextOverall(draft.picks, total);
  const onClock = { overall, teamSlot: slotOnClock(overall, cfg.teams) };
  const picked = new Set(draft.picks.map((p) => p.playerId));
  const available = snapshot.players.filter((p) => !picked.has(p.id));
  const rosters = foldRosters(draft);
  const playersById = new Map(snapshot.players.map((p) => [p.id, p]));
  const baselines = deriveBaselines(cfg);
  const tiers = buildTiers(available);
  const cliffs: TierBand[] = [];
  for (const bands of tiers.values()) {
    for (const band of bands) if (band.cliff) cliffs.push(band);
  }

  const horizon = survivalHorizonOf(overall, cfg);
  const userIds = rosters.get(cfg.userSlot) ?? [];
  const userCounts = countByPos(userIds, playersById);

  const recArgs = {
    available,
    userCounts,
    cfg,
    overall,
    baselines,
  };

  let sim: ReturnType<typeof runSimulation> | null = null;
  let pair: ReturnType<typeof recommendPair> | null = null;
  let recommendations: Rec[] = [];

  if (overall > total) {
    sim = null;
    recommendations = [];
  } else if (horizon === null) {
    recommendations = recommendSingle({ ...recArgs, sim: null, tiers });
  } else {
    const firstOfPair = isFirstOfPair(overall, cfg);
    const fromOverall = overall;
    sim = runSimulation({
      available: snapshot.players,
      picks: draft.picks.map((p) => ({ overall: p.overall, playerId: p.playerId })),
      cfg,
      rosters,
      fromOverall,
      toOverall: horizon,
      seed: djb2(key),
    });
    if (firstOfPair && available.length >= 2) {
      pair = recommendPair({ ...recArgs, sim, tiers });
      recommendations = pair.recs;
    } else {
      recommendations = recommendSingle({ ...recArgs, sim, tiers });
    }
  }

  const value: EngineState = {
    available,
    rosters,
    baselines,
    tiers,
    sim,
    recommendations,
    pair,
    onClock,
    nextUserPick: nextUserPickOf(overall, cfg),
    survivalHorizon: horizon,
    cliffs,
  };
  cache = { key, value };
  return value;
};
