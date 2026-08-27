import { normalCdf } from './rng';

export const adpOnlySurvival = (
  adp: number | null,
  toOverall: number,
  stdev: number | null,
): number => {
  if (adp == null) return 1;
  const sigma = Math.max(stdev ?? 3, 3);
  return normalCdf((adp - toOverall) / sigma);
};
