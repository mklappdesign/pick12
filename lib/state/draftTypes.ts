import { DEFAULT_CONFIG, type DraftConfig } from '../../constants/league';

export type PickRecord = { overall: number; teamSlot: number; playerId: string };
export type PlayerTag = 'target' | 'avoid';
export type DraftMode = 'real' | 'mock';

export type DraftState = {
  config: DraftConfig;
  teamNames: string[];
  picks: PickRecord[];
  tags: Record<string, PlayerTag | undefined>;
  notes: Record<string, string | undefined>;
  mode: DraftMode;
  draftStartedAt: string | null;
  revision: number;
};

export const emptyDraft = (): DraftState => ({
  config: DEFAULT_CONFIG,
  teamNames: Array.from({ length: 12 }, (_, i) => (i === 11 ? 'You' : `Team ${i + 1}`)),
  picks: [],
  tags: {},
  notes: {},
  mode: 'real',
  draftStartedAt: null,
  revision: 0,
});

export const nextOverall = (picks: PickRecord[], total = 180): number => {
  const taken = new Set(picks.map((p) => p.overall));
  for (let i = 1; i <= total; i++) if (!taken.has(i)) return i;
  return total + 1;
};
