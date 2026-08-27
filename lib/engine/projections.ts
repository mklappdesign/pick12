import type { Position } from '../../constants/league';

/** Representative 2021–2024 end-of-season PPR averages: [rank, points]. */
const ANCHORS: Record<Position, ReadonlyArray<readonly [number, number]>> = {
  QB: [
    [1, 400],
    [3, 375],
    [6, 350],
    [12, 310],
    [18, 280],
    [24, 250],
    [30, 220],
  ],
  RB: [
    [1, 340],
    [3, 300],
    [6, 270],
    [12, 230],
    [18, 205],
    [24, 180],
    [36, 140],
    [48, 110],
    [60, 90],
  ],
  WR: [
    [1, 340],
    [3, 305],
    [6, 280],
    [12, 250],
    [24, 210],
    [36, 175],
    [48, 150],
    [60, 130],
    [72, 110],
  ],
  TE: [
    [1, 250],
    [3, 180],
    [6, 150],
    [12, 120],
    [18, 100],
    [24, 85],
  ],
  K: [
    [1, 155],
    [6, 140],
    [12, 130],
    [22, 115],
  ],
  DST: [
    [1, 130],
    [6, 115],
    [12, 105],
    [25, 90],
  ],
};

export const projectPoints = (pos: Position, rank: number): number => {
  const anchors = ANCHORS[pos];
  const r = Math.max(1, rank);
  const [firstX, firstY] = anchors[0];
  if (r <= firstX) return firstY;

  for (let i = 0; i < anchors.length - 1; i++) {
    const [x0, y0] = anchors[i];
    const [x1, y1] = anchors[i + 1];
    if (r <= x1) {
      const t = (r - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }

  const [lastX, lastY] = anchors[anchors.length - 1];
  return lastY * 0.98 ** (r - lastX);
};
