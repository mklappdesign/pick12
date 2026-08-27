import type { Position } from '../../constants/league';

export type { Position };

export type Player = {
  id: string; // Sleeper id, team code for DST, or `ffc:${ffcId}`
  ffcId: number | null;
  name: string;
  searchKey: string;
  position: Position;
  team: string;
  bye: number | null;
  adp: number | null;
  adpStdev: number | null;
  timesDrafted: number | null;
  overallRank: number;
  posRank: number;
  injuryStatus: string | null;
  sleeperMatched: boolean;
};

export type Snapshot = { fetchedAt: string; players: Player[] };
