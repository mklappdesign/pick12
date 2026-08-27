import type { Position } from '../../constants/league';
import { projectPoints } from './projections';

export const vorp = (
  pos: Position,
  posRank: number,
  baselines: Record<Position, number>,
): number => projectPoints(pos, posRank) - projectPoints(pos, baselines[pos]);

export const effectiveVorp = (
  pos: Position,
  posRank: number,
  baselines: Record<Position, number>,
  round: number,
  rounds: number,
): number => {
  const raw = vorp(pos, posRank, baselines);
  if ((pos === 'K' || pos === 'DST') && round < rounds - 1) {
    return Math.min(raw, -50);
  }
  return raw;
};
