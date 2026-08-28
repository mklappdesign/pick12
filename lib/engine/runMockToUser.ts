import type { Snapshot } from '../data/types';
import { djb2 } from '../state/engineSelectors';
import { applyPick, nextOverall } from '../state/draftActions';
import type { DraftState } from '../state/draftTypes';
import { mulberry32 } from './rng';
import { sampleOpponentPick, type Rng } from './sampleOpponentPick';
import { slotOnClock } from './snakeMath';

export const mockSeed = (draftStartedAt: string, overall: number): number =>
  djb2(`${draftStartedAt}:${overall}`);

export const applyMockOpponentPick = (args: {
  state: DraftState;
  snapshot: Snapshot;
  rng: Rng;
}): DraftState => {
  const { state, snapshot, rng } = args;
  const total = state.config.teams * state.config.rounds;
  const overall = nextOverall(state.picks, total);
  if (overall > total) return state;
  const slot = slotOnClock(overall, state.config.teams);
  if (slot === state.config.userSlot) return state;

  const taken = new Set(state.picks.map((p) => p.playerId));
  const available = snapshot.players.filter((p) => !taken.has(p.id));
  if (available.length === 0) return state;

  const rosterIds = state.picks.filter((p) => p.teamSlot === slot).map((p) => p.playerId);
  const playersById = new Map(snapshot.players.map((p) => [p.id, p]));
  const id = sampleOpponentPick({
    available,
    rosterIds,
    playersById,
    overall,
    cfg: state.config,
    rng,
  });
  return applyPick(state, id);
};

export const skipToUserTurn = (args: { state: DraftState; snapshot: Snapshot }): DraftState => {
  const { snapshot } = args;
  const total = args.state.config.teams * args.state.config.rounds;
  let state = args.state;
  for (;;) {
    const overall = nextOverall(state.picks, total);
    if (overall > total) return state;
    if (slotOnClock(overall, state.config.teams) === state.config.userSlot) return state;
    const next = applyMockOpponentPick({
      state,
      snapshot,
      rng: mulberry32(mockSeed(state.draftStartedAt ?? '', overall)),
    });
    if (next === state) return state;
    state = next;
  }
};
