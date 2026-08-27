import assert from 'node:assert/strict';
import test from 'node:test';
import ffc from './fixtures/ffc.json';
import sleeper from './fixtures/sleeper.json';
import { mergeSources, validateSnapshot } from './buildSnapshot';
import { nameKey } from './normalizeName';
import type { Player, Position } from './types';

const SNAP = () => mergeSources(ffc as never, sleeper as never, '2026-08-26T00:00:00.000Z');

test('throws when FFC status is not Success', () => {
  assert.throws(() => mergeSources({ status: 'Error' } as never, sleeper as never, '2026-08-26T00:00:00.000Z'));
});

test('maps PK→K and DEF→DST', () => {
  const s = SNAP();
  assert.ok(s.players.some((p) => p.position === 'K'));
  assert.ok(s.players.some((p) => p.position === 'DST' && p.team === 'HOU'));
});

test('DST joins by team code and does not read missing DEF fields', () => {
  const dst = SNAP().players.find((p) => p.position === 'DST' && p.team === 'HOU');
  assert.ok(dst);
  assert.equal(dst!.sleeperMatched, true);
  assert.equal(dst!.id, 'HOU');
});

test('suffix-stripped name match', () => {
  const p = SNAP().players.find((p) => p.name.includes('Harrison'));
  assert.ok(p?.sleeperMatched);
});

test('duplicate name disambiguates by fantasy position (WR not LB)', () => {
  const p = SNAP().players.find((p) => p.name === 'Justin Jefferson');
  if (p) assert.notEqual(p.team, 'CLE');
});

test('unmatched FFC kept as ffc: id', () => {
  const p = SNAP().players.find((p) => p.name === 'Unmatchable Testguy');
  assert.ok(p);
  assert.equal(p!.sleeperMatched, false);
  assert.match(p!.id, /^ffc:/);
});

test('bye prefers FFC row then team map then static table', () => {
  const chase = SNAP().players.find((p) => nameKey(p.name) === 'jamarrchase');
  assert.equal(chase?.bye, 6);
});

test('missing team DSTs appended with adp null', () => {
  const dsts = SNAP().players.filter((p) => p.position === 'DST');
  assert.ok(dsts.length >= 32);
  assert.ok(dsts.some((p) => p.adp === null));
});

test('validateSnapshot rejects too few players', () => {
  assert.throws(() => validateSnapshot({ fetchedAt: '2026-08-26T00:00:00.000Z', players: [] }));
});

test('validateSnapshot rejects missing position set', () => {
  const players = Array.from({ length: 150 }, (_, i) => ({
    id: String(i),
    ffcId: i,
    name: 'X',
    searchKey: 'x',
    position: 'QB' as const,
    team: 'KC',
    bye: 5,
    adp: i,
    adpStdev: 1,
    timesDrafted: 1,
    overallRank: i + 1,
    posRank: i + 1,
    injuryStatus: null,
    sleeperMatched: true,
  }));
  assert.throws(() => validateSnapshot({ fetchedAt: '2026-08-26T00:00:00.000Z', players }));
});

test('validateSnapshot rejects unparseable fetchedAt', () => {
  const s = SNAP();
  assert.throws(() => validateSnapshot({ ...s, fetchedAt: 'nope' }));
});

test('validateSnapshot accepts a padded snapshot covering all positions', () => {
  const base = SNAP().players;
  const positions: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];
  const players: Player[] = [...base];
  let i = 0;
  while (players.length < 150) {
    const position = positions[i % positions.length];
    players.push({
      id: `pad-${i}`,
      ffcId: null,
      name: `Pad ${i}`,
      searchKey: `pad${i}`,
      position,
      team: 'KC',
      bye: 5,
      adp: 200 + i,
      adpStdev: 1,
      timesDrafted: 1,
      overallRank: players.length + 1,
      posRank: 1,
      injuryStatus: null,
      sleeperMatched: false,
    });
    i += 1;
  }
  validateSnapshot({ fetchedAt: '2026-08-26T00:00:00.000Z', players });
});
