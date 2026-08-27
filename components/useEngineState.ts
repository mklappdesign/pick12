import { useDraftStore } from '@/lib/state/draftStore';
import { computeEngineState } from '@/lib/state/engineSelectors';
import { useSnapshotStore } from '@/lib/state/snapshotStore';

export const useEngineState = () => {
  const snapshot = useSnapshotStore((s) => s.snapshot);
  const config = useDraftStore((s) => s.config);
  const teamNames = useDraftStore((s) => s.teamNames);
  const picks = useDraftStore((s) => s.picks);
  const tags = useDraftStore((s) => s.tags);
  const notes = useDraftStore((s) => s.notes);
  const mode = useDraftStore((s) => s.mode);
  const draftStartedAt = useDraftStore((s) => s.draftStartedAt);
  const revision = useDraftStore((s) => s.revision);
  if (!snapshot) return null;
  return computeEngineState(snapshot, {
    config,
    teamNames,
    picks,
    tags,
    notes,
    mode,
    draftStartedAt,
    revision,
  });
};

export const formatRankingsAsOf = (fetchedAt: string | undefined): string => {
  if (!fetchedAt) return 'Rankings as of —';
  const t = Date.parse(fetchedAt);
  if (!Number.isFinite(t)) return `Rankings as of ${fetchedAt}`;
  return `Rankings as of ${new Date(t).toLocaleString()}`;
};

export const lastName = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
};
