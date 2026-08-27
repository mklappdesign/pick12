import { create } from 'zustand';

import type { DraftConfig } from '../../constants/league';
import {
  applyEditPick,
  applyPick,
  applyReset,
  applySetConfig,
  applySetNote,
  applySetTag,
  applySetTeamNames,
  applyStart,
  applyUndo,
} from './draftActions';
import { loadDraft, saveDraft } from './draftStorage';
import type { DraftMode, DraftState, PlayerTag } from './draftTypes';
import { emptyDraft } from './draftTypes';

export type DraftStore = DraftState & {
  hydrate: () => Promise<void>;
  makePick: (playerId: string, teamSlot?: number) => Promise<void>;
  undo: () => Promise<void>;
  editPick: (overall: number, playerId: string | null) => Promise<void>;
  setTag: (playerId: string, tag: PlayerTag | null) => Promise<void>;
  setNote: (playerId: string, note: string) => Promise<void>;
  setConfig: (config: DraftConfig) => Promise<void>;
  setTeamNames: (teamNames: string[]) => Promise<void>;
  resetDraft: () => Promise<void>;
  startDraft: (mode: DraftMode) => Promise<void>;
};

const writeDraft = async (get: () => DraftStore): Promise<void> => {
  await saveDraft(get());
};

export const useDraftStore = create<DraftStore>((set, get) => ({
  ...emptyDraft(),
  hydrate: async () => {
    set(await loadDraft());
  },
  makePick: async (playerId, teamSlot) => {
    let s: DraftState = get();
    if (!s.draftStartedAt) {
      s = applyStart(s, s.mode, new Date().toISOString());
    }
    set(applyPick(s, playerId, teamSlot));
    await writeDraft(get);
  },
  undo: async () => {
    set(applyUndo(get()));
    await writeDraft(get);
  },
  editPick: async (overall, playerId) => {
    set(applyEditPick(get(), overall, playerId));
    await writeDraft(get);
  },
  setTag: async (playerId, tag) => {
    set(applySetTag(get(), playerId, tag));
    await writeDraft(get);
  },
  setNote: async (playerId, note) => {
    set(applySetNote(get(), playerId, note));
    await writeDraft(get);
  },
  setConfig: async (config) => {
    set(applySetConfig(get(), config));
    await writeDraft(get);
  },
  setTeamNames: async (teamNames) => {
    set(applySetTeamNames(get(), teamNames));
    await writeDraft(get);
  },
  resetDraft: async () => {
    set(applyReset(get()));
    await writeDraft(get);
  },
  startDraft: async (mode) => {
    set(applyStart(get(), mode, new Date().toISOString()));
    await writeDraft(get);
  },
}));
