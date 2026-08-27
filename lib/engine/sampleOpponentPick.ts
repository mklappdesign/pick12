import type { DraftConfig } from '../../constants/league';
import type { Player } from '../data/types';
import { countByPos } from './need';
import { need } from './need';
import { roundOf } from './snakeMath';

export type Rng = () => number;

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

  const byRank = [...remaining].sort((a, b) => a.overallRank - b.overallRank);
  const top3 = new Set(byRank.slice(0, 3).map((pl) => pl.id));
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
  const weights = candidates.map((pl) => {
    const adp = pl.adp ?? p + 20;
    const sigma = pl.adp == null ? 15 : Math.max(pl.adpStdev ?? 3, 3);
    const gauss = Math.exp(-((adp - p) ** 2) / (2 * sigma ** 2));
    return gauss * need(counts, pl.position, round, cfg);
  });

  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) {
    return [...candidates].sort((a, b) => a.overallRank - b.overallRank)[0].id;
  }

  let r = rng() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i].id;
  }
  return candidates[candidates.length - 1].id;
};
