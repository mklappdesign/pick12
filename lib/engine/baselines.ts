import type { DraftConfig, Position } from '../../constants/league';
import { projectPoints } from './projections';

const STARTER_POS: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];
const FLEX_ELIGIBLE: Position[] = ['RB', 'WR', 'TE'];

export const deriveBaselines = (cfg: DraftConfig): Record<Position, number> => {
  const alloc = {} as Record<Position, number>;
  for (const pos of STARTER_POS) {
    alloc[pos] = cfg.teams * cfg.starters[pos];
  }

  const flexAwards = cfg.teams * cfg.starters.FLEX;
  for (let i = 0; i < flexAwards; i++) {
    let best: Position = 'RB';
    let bestPts = -Infinity;
    for (const pos of FLEX_ELIGIBLE) {
      const pts = projectPoints(pos, alloc[pos] + 1);
      if (pts > bestPts) {
        bestPts = pts;
        best = pos;
      }
    }
    alloc[best] += 1;
  }

  const baselines = {} as Record<Position, number>;
  for (const pos of STARTER_POS) {
    baselines[pos] = alloc[pos] + 1;
  }
  return baselines;
};
