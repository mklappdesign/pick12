import fpRankings from '../../assets/fantasypros-2026.json';
import { BYE_WEEKS_2026, NFL_TEAMS } from './byeWeeks2026';
import { adpFromRank, type FantasyProsRow } from './fantasyPros';
import { nameKey } from './normalizeName';
import type { Player, Position, Snapshot } from './types';

export const FFC_ADP_URL =
  'https://fantasyfootballcalculator.com/api/v1/adp/ppr?teams=12&year=2026';
export const SLEEPER_PLAYERS_URL = 'https://api.sleeper.app/v1/players/nfl';

const FETCH_TIMEOUT_MS = 30_000;
const ELIGIBLE_FANTASY = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']);
const POSITIONS: readonly Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];

export type FfcRow = {
  player_id: number;
  name: string;
  position: string;
  team: string;
  adp: number | null;
  stdev: number | null;
  times_drafted: number | null;
  bye: number | null;
};

export type FfcResponse = {
  status: string;
  players?: FfcRow[];
};

export type SleeperPlayer = {
  player_id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  search_full_name?: string;
  team?: string | null;
  position?: string;
  fantasy_positions?: string[];
  active?: boolean;
  status?: string;
  search_rank?: number;
  injury_status?: string | null;
};

export type SleeperDb = Record<string, SleeperPlayer>;

type WorkingPlayer = Player & { searchRank: number | null };

const isDefPlayer = (p: SleeperPlayer): boolean => {
  const fps = p.fantasy_positions;
  if (Array.isArray(fps) && fps.includes('DEF')) return true;
  return p.position === 'DEF';
};

const mapFfcPosition = (raw: string): Position | null => {
  if (raw === 'PK') return 'K';
  if (raw === 'DEF') return 'DST';
  if (raw === 'QB' || raw === 'RB' || raw === 'WR' || raw === 'TE' || raw === 'K' || raw === 'DST') {
    return raw;
  }
  return null;
};

const sleeperHasPosition = (p: SleeperPlayer, pos: Position): boolean => {
  const fps = p.fantasy_positions ?? [];
  const want = pos === 'DST' ? 'DEF' : pos;
  return fps.includes(want);
};

const sleeperIndexKey = (p: SleeperPlayer): string => {
  if (isDefPlayer(p)) {
    return nameKey(`${p.first_name ?? ''} ${p.last_name ?? ''}`);
  }
  const raw = p.search_full_name ?? p.full_name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`;
  return nameKey(raw || '');
};

const sleeperDisplayName = (p: SleeperPlayer): string => {
  if (isDefPlayer(p)) {
    return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  }
  return (p.full_name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`).trim();
};

const sleeperSearchRank = (p: SleeperPlayer): number | null => {
  if (isDefPlayer(p)) return null;
  return typeof p.search_rank === 'number' ? p.search_rank : null;
};

const sleeperInjury = (p: SleeperPlayer): string | null => {
  if (isDefPlayer(p)) return null;
  return p.injury_status ?? null;
};

const buildSleeperIndex = (sleeper: SleeperDb): Map<string, SleeperPlayer[]> => {
  const index = new Map<string, SleeperPlayer[]>();
  for (const p of Object.values(sleeper)) {
    if (!p || p.active !== true || p.team == null) continue;
    const fps = p.fantasy_positions ?? [];
    if (!fps.some((fp) => ELIGIBLE_FANTASY.has(fp))) continue;
    const key = sleeperIndexKey(p);
    const list = index.get(key);
    if (list) list.push(p);
    else index.set(key, [p]);
  }
  return index;
};

const pickCandidate = (
  candidates: SleeperPlayer[],
  ffcTeam: string,
): SleeperPlayer | undefined => {
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0];
  const teamMatches = candidates.filter((c) => c.team === ffcTeam);
  const pool = teamMatches.length > 0 ? teamMatches : candidates;
  return [...pool].sort((a, b) => {
    const ar = sleeperSearchRank(a) ?? Number.POSITIVE_INFINITY;
    const br = sleeperSearchRank(b) ?? Number.POSITIVE_INFINITY;
    return ar - br;
  })[0];
};

const resolveBye = (
  rowBye: number | null | undefined,
  team: string,
  teamBye: Map<string, number>,
): number | null => {
  if (typeof rowBye === 'number' && Number.isFinite(rowBye)) return rowBye;
  const fromMap = teamBye.get(team);
  if (typeof fromMap === 'number') return fromMap;
  const fromTable = BYE_WEEKS_2026[team];
  return typeof fromTable === 'number' ? fromTable : null;
};

const sortWorking = (a: WorkingPlayer, b: WorkingPlayer): number => {
  const aAdp = a.adp != null;
  const bAdp = b.adp != null;
  if (aAdp !== bAdp) return aAdp ? -1 : 1;
  if (aAdp && bAdp) return (a.adp as number) - (b.adp as number);
  const aRank = a.searchRank != null;
  const bRank = b.searchRank != null;
  if (aRank !== bRank) return aRank ? -1 : 1;
  if (aRank && bRank) return (a.searchRank as number) - (b.searchRank as number);
  return a.name.localeCompare(b.name);
};

const assignRanks = (players: WorkingPlayer[]): Player[] => {
  const sorted = [...players].sort(sortWorking);
  const posCount = new Map<Position, number>();
  return sorted.map((p, i) => {
    const n = (posCount.get(p.position) ?? 0) + 1;
    posCount.set(p.position, n);
    const { searchRank: _searchRank, ...rest } = p;
    return { ...rest, overallRank: i + 1, posRank: n };
  });
};

export const mergeSources = (
  ffc: FfcResponse,
  sleeper: SleeperDb,
  fetchedAt: string,
): Snapshot => {
  if (ffc.status !== 'Success') {
    throw new Error(`FFC status is ${ffc.status}`);
  }

  const rows = ffc.players ?? [];
  const teamBye = new Map<string, number>();
  for (const row of rows) {
    if (row.team && typeof row.bye === 'number') teamBye.set(row.team, row.bye);
  }

  const index = buildSleeperIndex(sleeper);
  const working: WorkingPlayer[] = [];
  const dstTeams = new Set<string>();

  for (const row of rows) {
    const position = mapFfcPosition(row.position);
    if (!position) continue;

    let matched: SleeperPlayer | undefined;
    if (position === 'DST') {
      const byTeam = sleeper[row.team];
      if (byTeam && isDefPlayer(byTeam)) matched = byTeam;
    } else {
      const candidates = (index.get(nameKey(row.name)) ?? []).filter((p) =>
        sleeperHasPosition(p, position),
      );
      matched = pickCandidate(candidates, row.team);
    }

    const team = matched?.team ?? row.team;
    const bye = resolveBye(row.bye, team, teamBye);

    if (position === 'DST' && team) dstTeams.add(team);

    working.push({
      id: matched?.player_id ?? `ffc:${row.player_id}`,
      ffcId: row.player_id,
      name: row.name,
      searchKey: nameKey(row.name),
      position,
      team,
      bye,
      adp: row.adp ?? null,
      adpStdev: row.stdev ?? null,
      timesDrafted: row.times_drafted ?? null,
      overallRank: 0,
      posRank: 0,
      injuryStatus: matched ? sleeperInjury(matched) : null,
      sleeperMatched: Boolean(matched),
      searchRank: matched ? sleeperSearchRank(matched) : null,
    });
  }

  for (const code of NFL_TEAMS) {
    if (dstTeams.has(code)) continue;
    const def = sleeper[code];
    if (!def || !isDefPlayer(def)) continue;
    const name = sleeperDisplayName(def) || `${code} Defense`;
    const team = def.team ?? code;
    dstTeams.add(code);
    working.push({
      id: code,
      ffcId: null,
      name,
      searchKey: nameKey(name),
      position: 'DST',
      team,
      bye: resolveBye(null, team, teamBye),
      adp: null,
      adpStdev: null,
      timesDrafted: null,
      overallRank: 0,
      posRank: 0,
      injuryStatus: null,
      sleeperMatched: true,
      searchRank: null,
    });
  }

  return { fetchedAt, players: assignRanks(working) };
};

export const mergeFantasyPros = (
  rankings: FantasyProsRow[],
  sleeper: SleeperDb,
  fetchedAt: string,
): Snapshot => {
  const teamBye = new Map<string, number>();
  for (const row of rankings) {
    if (row.team && row.bye != null) teamBye.set(row.team, row.bye);
  }

  const index = buildSleeperIndex(sleeper);
  const working: Player[] = [];
  const dstTeams = new Set<string>();

  for (const row of rankings) {
    let matched: SleeperPlayer | undefined;
    if (row.position === 'DST') {
      const byTeam = sleeper[row.team];
      if (byTeam && isDefPlayer(byTeam)) matched = byTeam;
    } else {
      const candidates = (index.get(nameKey(row.name)) ?? []).filter((p) =>
        sleeperHasPosition(p, row.position),
      );
      matched = pickCandidate(candidates, row.team);
    }

    const team = matched?.team ?? row.team;
    const bye = resolveBye(row.bye, team, teamBye);
    if (row.position === 'DST' && team) dstTeams.add(team);

    working.push({
      id: matched?.player_id ?? `fp:${row.rk}`,
      ffcId: null,
      name: row.name,
      searchKey: nameKey(row.name),
      position: row.position,
      team,
      bye,
      adp: adpFromRank(row),
      adpStdev: 4,
      timesDrafted: null,
      overallRank: row.rk,
      posRank: row.posRank,
      injuryStatus: matched ? sleeperInjury(matched) : null,
      sleeperMatched: Boolean(matched),
    });
  }

  let nextRank = working.reduce((m, p) => Math.max(m, p.overallRank), 0);
  const dstPos = working.filter((p) => p.position === 'DST').length;
  let dstRank = dstPos;
  for (const code of NFL_TEAMS) {
    if (dstTeams.has(code)) continue;
    const def = sleeper[code];
    if (!def || !isDefPlayer(def)) continue;
    const name = sleeperDisplayName(def) || `${code} Defense`;
    const team = def.team ?? code;
    dstTeams.add(code);
    dstRank += 1;
    nextRank += 1;
    working.push({
      id: code,
      ffcId: null,
      name,
      searchKey: nameKey(name),
      position: 'DST',
      team,
      bye: resolveBye(null, team, teamBye),
      adp: null,
      adpStdev: null,
      timesDrafted: null,
      overallRank: nextRank,
      posRank: dstRank,
      injuryStatus: null,
      sleeperMatched: true,
    });
  }

  working.sort((a, b) => a.overallRank - b.overallRank);
  return { fetchedAt, players: working };
};

export const validateSnapshot = (s: Snapshot): void => {
  const fetched = Date.parse(s.fetchedAt);
  if (!Number.isFinite(fetched)) {
    throw new Error(`invalid fetchedAt: ${s.fetchedAt}`);
  }
  if (s.players.length < 150) {
    throw new Error(`snapshot has ${s.players.length} players; need >= 150`);
  }
  const seen = new Set<Position>();
  for (const p of s.players) {
    if (!p.name) throw new Error('player missing name');
    if (!p.position) throw new Error(`player ${p.id} missing position`);
    seen.add(p.position);
  }
  for (const pos of POSITIONS) {
    if (!seen.has(pos)) throw new Error(`snapshot missing position ${pos}`);
  }
};

const fetchJson = async (url: string, fetchFn: typeof fetch): Promise<unknown> => {
  const res = await fetchFn(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`${url} failed: ${res.status}`);
  }
  return res.json();
};

export const buildSnapshot = async (fetchFn: typeof fetch = fetch): Promise<Snapshot> => {
  const sleeper = (await fetchJson(SLEEPER_PLAYERS_URL, fetchFn)) as SleeperDb;
  const snapshot = mergeFantasyPros(fpRankings as FantasyProsRow[], sleeper, new Date().toISOString());
  validateSnapshot(snapshot);
  return snapshot;
};
