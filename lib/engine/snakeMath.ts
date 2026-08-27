import type { DraftConfig } from '../../constants/league';

export const roundOf = (overall: number, teams: number): number =>
  Math.floor((overall - 1) / teams) + 1;

export const slotOnClock = (overall: number, teams: number): number => {
  const i = (overall - 1) % teams;
  const round = roundOf(overall, teams);
  return round % 2 === 1 ? i + 1 : teams - i;
};

export const overallFor = (round: number, slot: number, teams: number): number =>
  round % 2 === 1 ? (round - 1) * teams + slot : round * teams - (slot - 1);

export const userPicks = (cfg: DraftConfig): number[] =>
  Array.from({ length: cfg.rounds }, (_, r) => overallFor(r + 1, cfg.userSlot, cfg.teams));

export const nextUserPick = (overall: number, cfg: DraftConfig): number | null =>
  userPicks(cfg).find((p) => p > overall) ?? null;

export const picksUntilUser = (onClockOverall: number, cfg: DraftConfig): number => {
  const next = userPicks(cfg).find((p) => p >= onClockOverall);
  if (next === undefined) return 0;
  return next - onClockOverall;
};

export const isFirstOfPair = (overall: number, cfg: DraftConfig): boolean =>
  nextUserPick(overall, cfg) === overall + 1;

export const survivalHorizon = (overall: number, cfg: DraftConfig): number | null => {
  const picks = userPicks(cfg);
  for (const p of picks) {
    if (p > overall && p !== overall + 1) return p;
  }
  return null;
};

export const formatPickClock = (overall: number, teams: number): string => {
  const round = roundOf(overall, teams);
  const slot = String(slotOnClock(overall, teams)).padStart(2, '0');
  return `Pick ${round}.${slot} (#${overall})`;
};
