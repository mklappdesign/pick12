import type { DraftConfig, Position } from '../../constants/league';
import type { Player } from '../data/types';

export type RosterCounts = Record<Position, number>;

const EMPTY_COUNTS: RosterCounts = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };

export const countByPos = (playerIds: string[], byId: Map<string, Player>): RosterCounts => {
  const counts: RosterCounts = { ...EMPTY_COUNTS };
  for (const id of playerIds) {
    const p = byId.get(id);
    if (p) counts[p.position] += 1;
  }
  return counts;
};

const extraFlex = (counts: RosterCounts, cfg: DraftConfig): number =>
  Math.max(0, (counts.RB ?? 0) - cfg.starters.RB) +
  Math.max(0, (counts.WR ?? 0) - cfg.starters.WR) +
  Math.max(0, (counts.TE ?? 0) - cfg.starters.TE);

const isOverCap = (pos: Position, n: number): boolean => {
  if (pos === 'QB' || pos === 'TE') return n >= 2;
  if (pos === 'K' || pos === 'DST') return n >= 1;
  return false;
};

export const need = (
  counts: RosterCounts,
  pos: Position,
  round: number,
  cfg: DraftConfig,
): number => {
  const n = counts[pos] ?? 0;
  if (n < cfg.starters[pos]) return 1.0;

  if ((pos === 'RB' || pos === 'WR' || pos === 'TE') && extraFlex(counts, cfg) < cfg.starters.FLEX) {
    return 0.7;
  }

  if (isOverCap(pos, n)) return 0.02;

  if ((pos === 'K' || pos === 'DST') && round < cfg.rounds - 1) return 0.01;

  return 0.25;
};
