import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { BYE_WEEKS_2026, NFL_TEAMS } from '../lib/data/byeWeeks2026';
import { buildSnapshot, validateSnapshot } from '../lib/data/buildSnapshot';
import { parseFantasyProsCsv } from '../lib/data/fantasyPros';
import { nameKey } from '../lib/data/normalizeName';
import type { Player, Position, Snapshot } from '../lib/data/types';

const POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];

const syntheticSnapshot = (): Snapshot => {
  const players: Player[] = [];
  for (let i = 0; i < 150; i += 1) {
    const position = POSITIONS[i % POSITIONS.length];
    const team = NFL_TEAMS[i % NFL_TEAMS.length] ?? 'KC';
    const name = `Synthetic ${position} ${i}`;
    players.push({
      id: `syn-${i}`,
      ffcId: i,
      name,
      searchKey: nameKey(name),
      position,
      team,
      bye: BYE_WEEKS_2026[team] ?? null,
      adp: i + 1,
      adpStdev: 1,
      timesDrafted: 1,
      overallRank: i + 1,
      posRank: Math.floor(i / POSITIONS.length) + 1,
      injuryStatus: null,
      sleeperMatched: false,
    });
  }
  return { fetchedAt: new Date().toISOString(), players };
};

const existingSnapshotIsUsable = (path: string): boolean => {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Snapshot;
    if (!parsed.players || parsed.players.length === 0) return false;
    validateSnapshot(parsed);
    return true;
  } catch {
    return false;
  }
};

const main = async () => {
  const csv = readFileSync(resolve('assets/fantasypros-2026.csv'), 'utf8');
  writeFileSync(resolve('assets/fantasypros-2026.json'), JSON.stringify(parseFantasyProsCsv(csv)));
  const out = resolve('assets/snapshot.json');
  let snapshot: Snapshot;
  try {
    snapshot = await buildSnapshot(fetch);
    validateSnapshot(snapshot);
  } catch (err) {
    if (existingSnapshotIsUsable(out)) {
      console.error(err);
      process.exit(1);
      return;
    }
    console.warn('live snapshot fetch failed; writing synthetic stand-in');
    console.warn(err);
    snapshot = syntheticSnapshot();
    validateSnapshot(snapshot);
  }
  writeFileSync(out, JSON.stringify(snapshot));
  console.log(`wrote ${snapshot.players.length} players to ${out}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
