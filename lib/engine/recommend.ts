import type { DraftConfig, Position } from '../../constants/league';
import type { Player } from '../data/types';
import type { RosterCounts } from './need';
import { need } from './need';
import { reasonText, type Rec } from './reasonText';
import type { ExpBest } from './simulation';
import { roundOf, survivalHorizon } from './snakeMath';
import { buildTiers, type TierBand } from './tiers';
import { effectiveVorp } from './vorp';

export type { Rec };

const POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];

type SimResult = {
  survival: Map<string, number>;
  expBestByPos: Record<Position, ExpBest>;
};

const extraFlex = (counts: RosterCounts, cfg: DraftConfig): number =>
  Math.max(0, (counts.RB ?? 0) - cfg.starters.RB) +
  Math.max(0, (counts.WR ?? 0) - cfg.starters.WR) +
  Math.max(0, (counts.TE ?? 0) - cfg.starters.TE);

const stillNeeded = (counts: RosterCounts, pos: Position, cfg: DraftConfig): boolean => {
  if ((counts[pos] ?? 0) < cfg.starters[pos]) return true;
  if ((pos === 'RB' || pos === 'WR' || pos === 'TE') && extraFlex(counts, cfg) < cfg.starters.FLEX) {
    return true;
  }
  return false;
};

export const needVorp = (
  player: Player,
  counts: RosterCounts,
  round: number,
  cfg: DraftConfig,
  baselines: Record<Position, number>,
): number =>
  effectiveVorp(player.position, player.posRank, baselines, round, cfg.rounds) *
  need(counts, player.position, round, cfg);

const playerTier = (tiers: Map<Position, TierBand[]>, player: Player): number | undefined => {
  const bands = tiers.get(player.position) ?? [];
  return bands.find((b) => b.playerIds.includes(player.id))?.tier;
};

const eligible = (
  player: Player,
  counts: RosterCounts,
  round: number,
  cfg: DraftConfig,
): boolean => {
  if ((player.position === 'K' || player.position === 'DST') && round < 14) return false;
  if (need(counts, player.position, round, cfg) < 0.05) return false;
  return true;
};

const singleScore = (
  player: Player,
  counts: RosterCounts,
  round: number,
  cfg: DraftConfig,
  baselines: Record<Position, number>,
  sim: SimResult | null,
): number => {
  const nv = needVorp(player, counts, round, cfg, baselines);
  if (!sim) return nv;
  const eVorp = effectiveVorp(player.position, player.posRank, baselines, round, cfg.rounds);
  const regret = Math.max(0, eVorp - sim.expBestByPos[player.position].vorp);
  return nv + regret;
};

const toRec = (
  player: Player,
  score: number,
  survival: number,
  overall: number,
  cfg: DraftConfig,
  tiers: Map<Position, TierBand[]>,
  reasonOpts?: Parameters<typeof reasonText>[1],
): Rec => {
  const rec: Rec = { player, score, survival, reason: '' };
  rec.reason = reasonText(rec, {
    horizon: survivalHorizon(overall, cfg) ?? undefined,
    tier: playerTier(tiers, player),
    ...reasonOpts,
  });
  return rec;
};

export const recommendSingle = (args: {
  available: Player[];
  userCounts: RosterCounts;
  cfg: DraftConfig;
  overall: number;
  baselines: Record<Position, number>;
  sim: SimResult | null;
  tiers?: Map<Position, TierBand[]>;
}): Rec[] => {
  const { available, userCounts, cfg, overall, baselines, sim } = args;
  const round = roundOf(overall, cfg.teams);
  const scored = available
    .filter((p) => eligible(p, userCounts, round, cfg))
    .map((player) => ({
      player,
      score: singleScore(player, userCounts, round, cfg, baselines, sim),
      survival: sim?.survival.get(player.id) ?? 1,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const tiers = args.tiers ?? buildTiers(available);
  return scored.map((s) => toRec(s.player, s.score, s.survival, overall, cfg, tiers));
};

const pairScore = (
  a: Player,
  b: Player,
  counts: RosterCounts,
  round: number,
  cfg: DraftConfig,
  baselines: Record<Position, number>,
  sim: SimResult,
): number => {
  const nvA = needVorp(a, counts, round, cfg, baselines);
  const afterA: RosterCounts = { ...counts, [a.position]: (counts[a.position] ?? 0) + 1 };
  const nvB = needVorp(b, afterA, round, cfg, baselines);
  const afterBoth: RosterCounts = { ...afterA, [b.position]: (afterA[b.position] ?? 0) + 1 };
  let bestRem = -Infinity;
  for (const pos of POSITIONS) {
    if (!stillNeeded(afterBoth, pos, cfg)) continue;
    bestRem = Math.max(bestRem, sim.expBestByPos[pos].vorp);
  }
  if (bestRem === -Infinity) bestRem = 0;
  return nvA + nvB + bestRem;
};

const orderPair = (
  a: Player,
  b: Player,
  counts: RosterCounts,
  round: number,
  cfg: DraftConfig,
  baselines: Record<Position, number>,
  sim: SimResult,
): [Player, Player] => {
  const survA = sim.survival.get(a.id) ?? 1;
  const survB = sim.survival.get(b.id) ?? 1;
  if (survA !== survB) return survA < survB ? [a, b] : [b, a];
  const nvA = needVorp(a, counts, round, cfg, baselines);
  const nvB = needVorp(b, counts, round, cfg, baselines);
  return nvA >= nvB ? [a, b] : [b, a];
};

export const recommendPair = (args: {
  available: Player[];
  userCounts: RosterCounts;
  cfg: DraftConfig;
  overall: number;
  baselines: Record<Position, number>;
  sim: SimResult;
  tiers?: Map<Position, TierBand[]>;
}): {
  pair: [Player, Player];
  score: number;
  recs: Rec[];
} => {
  const { available, userCounts, cfg, overall, baselines, sim } = args;
  const round = roundOf(overall, cfg.teams);
  const top8 = available
    .filter((p) => eligible(p, userCounts, round, cfg))
    .map((player) => ({
      player,
      score: singleScore(player, userCounts, round, cfg, baselines, sim),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((s) => s.player);

  let bestScore = -Infinity;
  let runnerUpScore = -Infinity;
  let bestA = top8[0];
  let bestB = top8[1];
  for (let i = 0; i < top8.length; i++) {
    for (let j = i + 1; j < top8.length; j++) {
      const score = pairScore(top8[i], top8[j], userCounts, round, cfg, baselines, sim);
      if (score > bestScore) {
        runnerUpScore = bestScore;
        bestScore = score;
        bestA = top8[i];
        bestB = top8[j];
      } else if (score > runnerUpScore) {
        runnerUpScore = score;
      }
    }
  }

  const pair = orderPair(bestA, bestB, userCounts, round, cfg, baselines, sim);
  const nextOverall = overall + 1;
  const delta = runnerUpScore === -Infinity ? 0 : bestScore - runnerUpScore;
  const tiers = args.tiers ?? buildTiers(available);
  const recs = [
    toRec(pair[0], bestScore, sim.survival.get(pair[0].id) ?? 1, overall, cfg, tiers, {
      pairNow: true,
      otherPos: pair[1].position,
      nextOverall,
      delta,
    }),
    toRec(pair[1], bestScore, sim.survival.get(pair[1].id) ?? 1, overall, cfg, tiers, {
      pairSafe: true,
      delta,
      nextOverall,
    }),
  ];
  return { pair, score: bestScore, recs };
};
