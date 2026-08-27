import type { DraftConfig } from '../../constants/league';
import { slotOnClock } from '../engine/snakeMath';
import type { DraftMode, DraftState, PlayerTag } from './draftTypes';
import { nextOverall } from './draftTypes';

export type { DraftMode, DraftState, PickRecord, PlayerTag } from './draftTypes';
export { emptyDraft, nextOverall } from './draftTypes';

export const applyPick = (state: DraftState, playerId: string, teamSlot?: number): DraftState => {
  const total = state.config.teams * state.config.rounds;
  const overall = nextOverall(state.picks, total);
  if (overall > total) return state;
  if (state.picks.some((p) => p.playerId === playerId)) return state;
  const slot = teamSlot ?? slotOnClock(overall, state.config.teams);
  return {
    ...state,
    picks: [...state.picks, { overall, teamSlot: slot, playerId }],
  };
};

export const applyUndo = (state: DraftState): DraftState => ({
  ...state,
  picks: state.picks.slice(0, -1),
});

export const applyEditPick = (
  state: DraftState,
  overall: number,
  playerId: string | null,
): DraftState => {
  const revision = state.revision + 1;
  if (playerId === null) {
    return { ...state, revision, picks: state.picks.filter((p) => p.overall !== overall) };
  }
  const teamSlot = slotOnClock(overall, state.config.teams);
  const idx = state.picks.findIndex((p) => p.overall === overall);
  if (idx === -1) {
    return { ...state, revision, picks: [...state.picks, { overall, teamSlot, playerId }] };
  }
  const picks = state.picks.slice();
  picks[idx] = { ...picks[idx], playerId, teamSlot };
  return { ...state, revision, picks };
};

export const applyReset = (state: DraftState): DraftState => ({
  ...state,
  picks: [],
  draftStartedAt: null,
  mode: 'real',
  revision: 0,
});

export const applySetTag = (state: DraftState, playerId: string, tag: PlayerTag | null): DraftState => {
  const tags = { ...state.tags };
  if (tag === null) delete tags[playerId];
  else tags[playerId] = tag;
  return { ...state, tags };
};

export const applySetNote = (state: DraftState, playerId: string, note: string): DraftState => ({
  ...state,
  notes: { ...state.notes, [playerId]: note },
});

export const applySetConfig = (state: DraftState, config: DraftConfig): DraftState => {
  if (state.picks.length > 0) return state;
  return { ...state, config };
};

export const applySetTeamNames = (state: DraftState, teamNames: string[]): DraftState => ({
  ...state,
  teamNames,
});

export const applyStart = (state: DraftState, mode: DraftMode, nowIso: string): DraftState => ({
  ...state,
  mode,
  draftStartedAt: nowIso,
});
