import type { Player } from '../data/types';
import { overallFor } from '../engine/snakeMath';
import type { DraftState } from './draftTypes';

export const formatRosters = (state: DraftState, playersById: Map<string, Player>): string => {
  const { teams, rounds } = state.config;
  const bySlot = new Map<number, Map<number, string>>();
  for (const pick of state.picks) {
    let bag = bySlot.get(pick.teamSlot);
    if (!bag) {
      bag = new Map();
      bySlot.set(pick.teamSlot, bag);
    }
    bag.set(pick.overall, pick.playerId);
  }

  const blocks: string[] = [];
  for (let slot = 1; slot <= teams; slot++) {
    const heading = state.teamNames[slot - 1] ?? `Team ${slot}`;
    const lines = [heading];
    const bag = bySlot.get(slot);
    for (let round = 1; round <= rounds; round++) {
      const overall = overallFor(round, slot, teams);
      const id = bag?.get(overall);
      if (!id) {
        lines.push(`${round}. (empty)`);
        continue;
      }
      const p = playersById.get(id);
      lines.push(p ? `${round}. ${p.name} ${p.position} ${p.team}` : `${round}. (empty)`);
    }
    blocks.push(lines.join('\n'));
  }
  return blocks.join('\n');
};
