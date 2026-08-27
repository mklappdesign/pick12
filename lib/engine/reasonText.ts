import type { Player } from '../data/types';

export type Rec = {
  player: Player;
  score: number;
  survival: number;
  reason: string;
};

export const reasonText = (
  rec: Rec,
  opts?: {
    pairSafe?: boolean;
    pairNow?: boolean;
    delta?: number;
    horizon?: number;
    nextOverall?: number;
    otherPos?: string;
    tier?: number;
  },
): string => {
  const pct = Math.round(rec.survival * 100);
  const pos = rec.player.position;
  if (opts?.pairNow || opts?.pairSafe) {
    const delta = Math.round(Math.abs(opts.delta ?? 0));
    const next = opts.nextOverall ?? 0;
    if (opts.pairNow && opts.otherPos) {
      return `Take the ${pos} now (${pct}% survival) and the ${opts.otherPos} at ${next} (safe) — best pair by +${delta} points.`;
    }
    return `Take the ${pos} now (${pct}% survival) (safe) — best pair by +${delta} points.`;
  }
  const tierBit = opts?.tier != null ? ` in tier ${opts.tier}` : '';
  const pickBit = opts?.horizon != null ? ` at pick ${opts.horizon}` : '';
  return `Best ${pos} left${tierBit} — ${pct}% chance he's back${pickBit}.`;
};
