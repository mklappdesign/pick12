import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DraftState } from './draftTypes';
import { emptyDraft } from './draftTypes';

export const DRAFT_KEY = '@pick12/draft';

const asDraft = (raw: unknown): DraftState | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<DraftState>;
  if (!Array.isArray(o.picks)) return null;
  const base = emptyDraft();
  return {
    ...base,
    ...o,
    picks: o.picks,
    tags: o.tags ?? {},
    notes: o.notes ?? {},
    teamNames:
      Array.isArray(o.teamNames) && o.teamNames.length === 12 ? o.teamNames : base.teamNames,
    config: o.config ?? base.config,
    mode: o.mode === 'mock' || o.mode === 'real' ? o.mode : base.mode,
    draftStartedAt: o.draftStartedAt ?? null,
    revision: typeof o.revision === 'number' ? o.revision : 0,
  };
};

export const loadDraft = async (): Promise<DraftState> => {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return emptyDraft();
    const parsed = asDraft(JSON.parse(raw));
    return parsed ?? emptyDraft();
  } catch {
    return emptyDraft();
  }
};

export const saveDraft = async (state: DraftState): Promise<void> => {
  const slice: DraftState = {
    config: state.config,
    teamNames: state.teamNames,
    picks: state.picks,
    tags: state.tags,
    notes: state.notes,
    mode: state.mode,
    draftStartedAt: state.draftStartedAt,
    revision: state.revision,
  };
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(slice));
};
