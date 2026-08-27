import assert from 'node:assert/strict';
import test from 'node:test';
import type { Player, Snapshot } from '../data/types';
import { mergeOrphans } from './snapshotOrphans';

const player = (id: string): Player => ({
  id,
  ffcId: null,
  name: id,
  searchKey: id,
  position: 'RB',
  team: 'KC',
  bye: 5,
  adp: 10,
  adpStdev: 3,
  timesDrafted: 5,
  overallRank: 1,
  posRank: 1,
  injuryStatus: null,
  sleeperMatched: true,
});

test('mergeOrphans overlays picked players missing from the new snapshot', () => {
  const prev: Snapshot = { fetchedAt: 'old', players: [player('kept'), player('orphan')] };
  const next: Snapshot = { fetchedAt: 'new', players: [player('kept'), player('fresh')] };
  const merged = mergeOrphans(prev, next, ['orphan', 'kept']);
  const ids = merged.players.map((p) => p.id);
  assert.ok(ids.includes('orphan'));
  assert.ok(ids.includes('fresh'));
  assert.equal(merged.fetchedAt, 'new');
});
