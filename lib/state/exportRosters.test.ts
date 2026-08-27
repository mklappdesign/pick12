import assert from 'node:assert/strict';
import test from 'node:test';
import type { Player } from '../data/types';
import { applyEditPick, applyStart, emptyDraft } from './draftActions';
import { formatRosters } from './exportRosters';

const player = (id: string, name: string): Player => ({
  id,
  ffcId: null,
  name,
  searchKey: name.toLowerCase(),
  position: 'WR',
  team: 'CIN',
  bye: 10,
  adp: 1,
  adpStdev: 3,
  timesDrafted: 10,
  overallRank: 1,
  posRank: 1,
  injuryStatus: null,
  sleeperMatched: true,
});

test('one pick on slot 12 includes You and the player name', () => {
  let s = applyStart(emptyDraft(), 'real', 't');
  s = applyEditPick(s, 12, 'chase');
  const text = formatRosters(s, new Map([['chase', player('chase', 'Ja\'Marr Chase')]]));
  assert.match(text, /You/);
  assert.match(text, /Ja'Marr Chase/);
});
