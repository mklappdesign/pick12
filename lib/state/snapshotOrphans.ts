import type { Snapshot } from '../data/types';

export const mergeOrphans = (prev: Snapshot, next: Snapshot, pickedIds: string[]): Snapshot => {
  const nextIds = new Set(next.players.map((p) => p.id));
  const prevById = new Map(prev.players.map((p) => [p.id, p]));
  const extras = pickedIds
    .filter((id) => !nextIds.has(id))
    .map((id) => prevById.get(id))
    .filter((p): p is NonNullable<typeof p> => p != null);
  if (extras.length === 0) return next;
  return { ...next, players: [...next.players, ...extras] };
};
