import assert from 'node:assert/strict';
import test from 'node:test';
import type { Player, Snapshot } from '../data/types';
import { runSimulation } from '../engine/simulation';
import { applyEditPick, applyPick, applyStart, emptyDraft } from './draftActions';
import { nextOverall } from './draftTypes';
import { computeEngineState, djb2, playersForSimulation } from './engineSelectors';

const player = (
  id: string,
  pos: Player['position'],
  overallRank: number,
  posRank: number,
  adp = overallRank + 10,
): Player => ({
  id,
  ffcId: null,
  name: id,
  searchKey: id,
  position: pos,
  team: 'KC',
  bye: 5,
  adp,
  adpStdev: 4,
  timesDrafted: 8,
  overallRank,
  posRank,
  injuryStatus: null,
  sleeperMatched: true,
});

const dummySnapshot = (): Snapshot => ({
  fetchedAt: 't',
  players: [
    player('qb1', 'QB', 15, 1),
    player('rb1', 'RB', 1, 1),
    player('rb2', 'RB', 4, 2),
    player('wr1', 'WR', 2, 1),
    player('wr2', 'WR', 3, 2),
    player('wr3', 'WR', 6, 3),
    player('te1', 'TE', 20, 1),
    player('k1', 'K', 140, 1),
    player('dst1', 'DST', 150, 1),
    player('rb3', 'RB', 30, 8),
  ],
});

test('memo returns referential equality', () => {
  const snapshot = dummySnapshot();
  const draft = applyStart(emptyDraft(), 'real', 't');
  const a = computeEngineState(snapshot, draft);
  const b = computeEngineState(snapshot, draft);
  assert.equal(a, b);
});

test('editPick revision bump invalidates memo', () => {
  const snapshot = dummySnapshot();
  const draft = applyStart(emptyDraft(), 'real', 't');
  const a = computeEngineState(snapshot, draft);
  const edited = applyEditPick(draft, 1, 'rb1');
  const c = computeEngineState(snapshot, edited);
  assert.notEqual(a, c);
});

test('simulation board keeps drafted ids and drops deep leftovers', () => {
  const picked = new Set(['deep-picked']);
  const board = playersForSimulation(
    [
      player('star', 'RB', 1, 1, 1),
      player('deep-picked', 'WR', 450, 90, 450),
      player('deep-bench', 'WR', 451, 91, 451),
      player('adp-riser', 'RB', 400, 80, 20),
    ],
    picked,
    12,
  );
  const ids = board.map((p) => p.id).sort();
  assert.deepEqual(ids, ['adp-riser', 'deep-picked', 'star']);
});

test('engine list stays full while sim omits deep leftovers', () => {
  const deep = player('deep-bench', 'RB', 450, 90, 450);
  const snapshot: Snapshot = { fetchedAt: 't', players: [...dummySnapshot().players, deep] };
  const draft = applyStart(emptyDraft(), 'real', 't');
  const engine = computeEngineState(snapshot, draft);
  assert.ok(engine.available.some((p) => p.id === 'deep-bench'));
  assert.equal(engine.sim?.survival.has('deep-bench'), false);
});

test('opponent on the clock includes that pick in survival', () => {
  const taken = Array.from({ length: 13 }, (_, i) =>
    player(`taken${i}`, i % 2 === 0 ? 'WR' : 'RB', 200 + i, 40 + i, 200),
  );
  const clustered = Array.from({ length: 50 }, (_, i) =>
    player(`c${i}`, i % 2 === 0 ? 'RB' : 'WR', 10 + i, 1 + (i >> 1), 14 + (i % 8)),
  );
  const snapshot: Snapshot = { fetchedAt: 't', players: [...taken, ...clustered] };
  let draft = applyStart(emptyDraft(), 'real', 't');
  for (const p of taken) draft = applyPick(draft, p.id);

  const engine = computeEngineState(snapshot, draft);
  assert.equal(engine.onClock.overall, 14);
  assert.notEqual(engine.onClock.teamSlot, draft.config.userSlot);

  const last = draft.picks[draft.picks.length - 1]?.playerId ?? '';
  const key = [
    snapshot.fetchedAt,
    nextOverall(draft.picks),
    last,
    draft.revision,
    JSON.stringify(draft.config),
  ].join('|');
  const simArgs = {
    available: snapshot.players,
    picks: draft.picks.map((p) => ({ overall: p.overall, playerId: p.playerId })),
    cfg: draft.config,
    rosters: engine.rosters,
    toOverall: 36,
    seed: djb2(key),
  };
  const includeOnClock = runSimulation({ ...simArgs, fromOverall: 14 });
  const skipOnClock = runSimulation({ ...simArgs, fromOverall: 15 });
  const got = engine.sim?.survival.get('c0');
  const included = includeOnClock.survival.get('c0');
  const skipped = skipOnClock.survival.get('c0');
  assert.equal(got, included);
  assert.ok(
    (included ?? 1) < (skipped ?? 0),
    `including pick 14 should lower survival: ${included} vs ${skipped}`,
  );
});
