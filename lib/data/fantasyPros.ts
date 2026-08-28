import type { Position } from '../../constants/league';

export type FantasyProsRow = {
  rk: number;
  name: string;
  team: string;
  position: Position;
  posRank: number;
  bye: number | null;
  ecrVsAdp: number | null;
};

const TEAM_ALIASES: Record<string, string> = { JAC: 'JAX' };

export const normalizeTeam = (team: string): string => TEAM_ALIASES[team] ?? team;

export const splitCsvLine = (line: string): string[] => {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
};

const parsePos = (raw: string): { position: Position; posRank: number } | null => {
  const m = raw.trim().match(/^(QB|RB|WR|TE|K|DST|DEF|PK)(\d+)$/i);
  if (!m) return null;
  const code = m[1].toUpperCase();
  const position: Position =
    code === 'DEF' || code === 'DST' ? 'DST' : code === 'PK' ? 'K' : (code as Position);
  return { position, posRank: Number(m[2]) };
};

const parseSigned = (raw: string): number | null => {
  const t = raw.trim();
  if (!t || t === '-') return null;
  const n = Number(t.replace(/^\+/, ''));
  return Number.isFinite(n) ? n : null;
};

export const parseFantasyProsCsv = (text: string): FantasyProsRow[] => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows: FantasyProsRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const rk = Number(cols[0]);
    if (!Number.isFinite(rk) || rk <= 0) continue;
    const name = (cols[2] ?? '').trim();
    const team = normalizeTeam((cols[3] ?? '').trim());
    const parsedPos = parsePos(cols[4] ?? '');
    if (!name || !parsedPos) continue;
    const byeRaw = Number(cols[5]);
    rows.push({
      rk,
      name,
      team,
      position: parsedPos.position,
      posRank: parsedPos.posRank,
      bye: Number.isFinite(byeRaw) ? byeRaw : null,
      ecrVsAdp: parseSigned(cols[9] ?? ''),
    });
  }
  return rows;
};

export const adpFromRank = (row: FantasyProsRow): number =>
  row.ecrVsAdp != null ? row.rk + row.ecrVsAdp : row.rk;
