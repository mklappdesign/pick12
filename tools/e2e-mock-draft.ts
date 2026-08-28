import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

import type { Snapshot } from '../lib/data/types';
import { mockSeed } from '../lib/engine/runMockToUser';
import { mulberry32 } from '../lib/engine/rng';
import { sampleOpponentPick } from '../lib/engine/sampleOpponentPick';
import { roundOf, slotOnClock } from '../lib/engine/snakeMath';
import { applyPick, applyStart, emptyDraft, nextOverall } from '../lib/state/draftActions';
import { computeEngineState } from '../lib/state/engineSelectors';

const snapshot = JSON.parse(readFileSync('assets/snapshot.json', 'utf8')) as Snapshot;
if (snapshot.players.length < 150) {
  console.error('snapshot too small');
  process.exit(1);
}

let state = applyStart(emptyDraft(), 'mock', 'e2e-2026');
const seen = new Set<string>();

while (nextOverall(state.picks) <= 180) {
  const overall = nextOverall(state.picks);
  const slot = slotOnClock(overall, state.config.teams);
  const t0 = performance.now();
  const engine = computeEngineState(snapshot, state);
  const dt = performance.now() - t0;
  if (dt >= 50) {
    console.error(`engine ${dt.toFixed(1)}ms at overall ${overall}`);
    process.exit(1);
  }
  if (engine.onClock.teamSlot !== slot) {
    console.error('onClock mismatch');
    process.exit(1);
  }
  let playerId: string;
  if (slot === state.config.userSlot) {
    if (overall === 12) {
      const pair = engine.pair?.pair ?? [];
      const pool = pair.length > 0 ? pair : engine.recommendations.map((r) => r.player);
      if (!pool.some((p) => p.position === 'RB' || p.position === 'WR')) {
        const pos = pool[0]?.position;
        console.error(`round-1 rec was ${pos}`);
        process.exit(1);
      }
    }
    playerId = engine.pair?.pair[0].id ?? engine.recommendations[0]?.player.id ?? '';
    if (!playerId) {
      console.error(`no user rec at ${overall}`);
      process.exit(1);
    }
    const p = snapshot.players.find((x) => x.id === playerId);
    const rnd = roundOf(overall, 12);
    if (p && (p.position === 'K' || p.position === 'DST') && rnd < 14) {
      console.error(`late-round pin broken at ${overall}`);
      process.exit(1);
    }
  } else {
    const available = engine.available;
    const byId = new Map(snapshot.players.map((p) => [p.id, p]));
    const rosterIds = engine.rosters.get(slot) ?? [];
    playerId = sampleOpponentPick({
      available,
      rosterIds,
      playersById: byId,
      overall,
      cfg: state.config,
      rng: mulberry32(mockSeed(state.draftStartedAt!, overall)),
    });
  }
  if (seen.has(playerId)) {
    console.error(`duplicate ${playerId}`);
    process.exit(1);
  }
  seen.add(playerId);
  const before = state.picks.length;
  state = applyPick(state, playerId);
  if (state.picks.length !== before + 1) {
    console.error(`pick did not apply at ${overall} id=${playerId}`);
    process.exit(1);
  }
  if (state.picks.at(-1)?.teamSlot !== slot) {
    console.error('slot mismatch');
    process.exit(1);
  }
}

for (let slot = 1; slot <= 12; slot++) {
  if (state.picks.filter((p) => p.teamSlot === slot).length !== 15) {
    console.error(`slot ${slot} incomplete`);
    process.exit(1);
  }
}

const userIds = state.picks.filter((p) => p.teamSlot === 12).map((p) => p.playerId);
const userPlayers = userIds.map((id) => snapshot.players.find((p) => p.id === id)!);
const ks = userPlayers.filter((p) => p.position === 'K');
const dsts = userPlayers.filter((p) => p.position === 'DST');
if (ks.length !== 1 || dsts.length !== 1) {
  console.error(`user K/DST counts ${ks.length}/${dsts.length}`);
  process.exit(1);
}
for (const p of [...ks, ...dsts]) {
  const overall = state.picks.find((x) => x.playerId === p.id)!.overall;
  if (roundOf(overall, 12) < 14) {
    console.error('user K/DST too early');
    process.exit(1);
  }
}

console.log('e2e ok');
