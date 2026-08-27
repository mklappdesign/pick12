import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyEditPick,
  applyPick,
  applyReset,
  applySetNote,
  applySetTag,
  applyStart,
  applyUndo,
  emptyDraft,
} from './draftActions';

test('infers slot from snake of nextOverall', () => {
  let s = applyStart(emptyDraft(), 'real', '2026-01-01T00:00:00.000Z');
  s = applyPick(s, 'p1');
  assert.equal(s.picks[0]?.overall, 1);
  assert.equal(s.picks[0]?.teamSlot, 1);
});

test('undo pops last append', () => {
  let s = applyPick(applyStart(emptyDraft(), 'real', 't'), 'a');
  s = applyPick(s, 'b');
  s = applyUndo(s);
  assert.equal(s.picks.length, 1);
  assert.equal(s.picks[0]?.playerId, 'a');
});

test('editPick remove leaves a hole that next pick fills', () => {
  let s = applyStart(emptyDraft(), 'real', 't');
  s = applyPick(s, 'a'); // overall 1
  s = applyPick(s, 'b'); // 2
  s = applyPick(s, 'c'); // 3
  s = applyEditPick(s, 2, null);
  s = applyPick(s, 'd');
  assert.equal(s.picks.find((p) => p.playerId === 'd')?.overall, 2);
  assert.notEqual(s.picks.length, 4); // 3 remaining: 1,3,2 not length+1=4
});

test('reset keeps tags notes config names', () => {
  let s = emptyDraft();
  s = applySetTag(s, 'x', 'target');
  s = applySetNote(s, 'x', 'smash');
  s = applyStart(s, 'real', 't');
  s = applyPick(s, 'a');
  s = applyReset(s);
  assert.equal(s.picks.length, 0);
  assert.equal(s.draftStartedAt, null);
  assert.equal(s.tags.x, 'target');
  assert.equal(s.notes.x, 'smash');
  assert.equal(s.config.teams, 12);
});
