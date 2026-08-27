import type { Position } from '../../constants/league';
import type { Player } from '../data/types';
import { projectPoints } from './projections';

export type TierBand = { pos: Position; tier: number; playerIds: string[]; cliff: boolean };

export const tierCliff = (band: TierBand): boolean => band.playerIds.length <= 2;

const POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];
const MAX_TIERS = 10;

const median = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const last8 = (gaps: number[]): number[] => gaps.slice(-8);

const closeBand = (pos: Position, tier: number, playerIds: string[]): TierBand => {
  const band: TierBand = { pos, tier, playerIds, cliff: false };
  band.cliff = tierCliff(band);
  return band;
};

const tiersForPos = (pos: Position, players: Player[]): TierBand[] => {
  if (players.length === 0) return [];
  const sorted = [...players].sort(
    (a, b) => projectPoints(pos, b.posRank) - projectPoints(pos, a.posRank),
  );

  const bands: TierBand[] = [];
  let currentIds = [sorted[0].id];
  const gaps: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prevPts = projectPoints(pos, sorted[i - 1].posRank);
    const currPts = projectPoints(pos, sorted[i].posRank);
    const gap = prevPts - currPts;
    gaps.push(gap);
    const threshold = Math.max(6, 1.75 * median(last8(gaps)));
    const canSplit = bands.length + 1 < MAX_TIERS;
    if (gap >= Math.min(40, threshold) && canSplit) {
      bands.push(closeBand(pos, bands.length + 1, currentIds));
      currentIds = [sorted[i].id];
    } else {
      currentIds.push(sorted[i].id);
    }
  }

  bands.push(closeBand(pos, bands.length + 1, currentIds));
  return bands;
};

export const buildTiers = (available: Player[]): Map<Position, TierBand[]> => {
  const byPos = new Map<Position, Player[]>();
  for (const pos of POSITIONS) byPos.set(pos, []);
  for (const p of available) {
    byPos.get(p.position)?.push(p);
  }
  const out = new Map<Position, TierBand[]>();
  for (const pos of POSITIONS) {
    out.set(pos, tiersForPos(pos, byPos.get(pos) ?? []));
  }
  return out;
};
