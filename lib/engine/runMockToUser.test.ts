import assert from 'node:assert/strict';
import test from 'node:test';
import type { Snapshot } from '../data/types';
import { computeEngineState } from '../state/engineSelectors';
import { applyPick, applyStart, emptyDraft, nextOverall } from '../state/draftActions';
import { mulberry32 } from './rng';
import { slotOnClock } from './snakeMath';
import { applyMockOpponentPick, mockSeed, skipToUserTurn } from './runMockToUser';

const snapshot = require('../../assets/snapshot.json') as Snapshot;

test('seeded skip fills 11 opponents before pick 12 and is deterministic', () => {
  const a = skipToUserTurn({ state: applyStart(emptyDraft(), 'mock', 'seed-iso'), snapshot });
  const b = skipToUserTurn({ state: applyStart(emptyDraft(), 'mock', 'seed-iso'), snapshot });
  assert.deepEqual(
    a.picks.map((p) => p.playerId),
    b.picks.map((p) => p.playerId),
  );
  assert.equal(a.picks.length, 11);
  assert.equal(nextOverall(a.picks), 12);
});

test('full 180-pick script: every team has 10 starters worth of players + 5 bench (15 each), no duplicate ids', () => {
  let state = applyStart(emptyDraft(), 'mock', 'full');
  while (nextOverall(state.picks) <= 180) {
    const overall = nextOverall(state.picks);
    const slot = slotOnClock(overall, 12);
    if (slot === state.config.userSlot) {
      const engine = computeEngineState(snapshot, state);
      const id = engine.pair?.pair[0].id ?? engine.recommendations[0]?.player.id;
      assert.ok(id, `no rec at ${overall}`);
      state = applyPick(state, id!);
    } else {
      state = applyMockOpponentPick({
        state,
        snapshot,
        rng: mulberry32(mockSeed(state.draftStartedAt!, overall)),
      });
    }
  }
  assert.equal(state.picks.length, 180);
  assert.equal(new Set(state.picks.map((p) => p.playerId)).size, 180);
  for (let slot = 1; slot <= 12; slot++) {
    assert.equal(state.picks.filter((p) => p.teamSlot === slot).length, 15);
  }
});
