import { create } from 'zustand';

import { loadSnapshot, refreshSnapshot } from '../data/snapshotStorage';
import type { Snapshot } from '../data/types';
import { useDraftStore } from './draftStore';
import { mergeOrphans } from './snapshotOrphans';

export type SnapshotSource = 'stored' | 'bundled';

export type SnapshotStore = {
  snapshot: Snapshot | null;
  source: SnapshotSource | null;
  ageMs: number;
  error: string | null;
  refreshing: boolean;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
};

const ageOf = (snapshot: Snapshot | null): number => {
  if (!snapshot) return 0;
  const t = Date.parse(snapshot.fetchedAt);
  return Number.isFinite(t) ? Date.now() - t : 0;
};

export const useSnapshotStore = create<SnapshotStore>((set, get) => ({
  snapshot: null,
  source: null,
  ageMs: 0,
  error: null,
  refreshing: false,
  hydrate: async () => {
    const { snapshot, source } = await loadSnapshot();
    set({ snapshot, source, ageMs: ageOf(snapshot), error: null });
  },
  refresh: async () => {
    set({ refreshing: true, error: null });
    const prev = get().snapshot;
    const result = await refreshSnapshot();
    if (!result.ok) {
      set({
        refreshing: false,
        error: result.error,
        snapshot: result.snapshot,
        ageMs: ageOf(result.snapshot),
      });
      return;
    }
    const pickedIds = useDraftStore.getState().picks.map((p) => p.playerId);
    const snapshot = prev ? mergeOrphans(prev, result.snapshot, pickedIds) : result.snapshot;
    set({
      snapshot,
      source: 'stored',
      ageMs: ageOf(snapshot),
      error: null,
      refreshing: false,
    });
  },
}));
