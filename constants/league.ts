export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST';

export type DraftConfig = {
  teams: number;
  userSlot: number;
  rounds: number;
  starters: { QB: number; RB: number; WR: number; TE: number; FLEX: number; K: number; DST: number };
  bench: number;
  scoring: 'ppr';
};

export const DEFAULT_CONFIG: DraftConfig = {
  teams: 12,
  userSlot: 12,
  rounds: 15,
  starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DST: 1 },
  bench: 5,
  scoring: 'ppr',
};
