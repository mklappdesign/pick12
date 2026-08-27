export const stripSuffix = (s: string): string =>
  s.replace(/\s+(jr|sr|ii|iii|iv)\.?$/i, '').trim();

export const normalizeName = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

export const nameKey = (s: string): string => normalizeName(stripSuffix(s));
