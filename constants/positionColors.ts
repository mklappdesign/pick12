import type { Position } from './league';

export const POSITION_COLORS: Record<Position, string> = {
  QB: '#E57373',
  RB: '#81C784',
  WR: '#64B5F6',
  TE: '#FFB74D',
  K: '#BA68C8',
  DST: '#90A4AE',
};

export const SURVIVAL_LOW = '#E53935';
export const SURVIVAL_HIGH = '#66BB6A';

const hexRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

export const survivalColor = (t: number): string => {
  const x = Math.min(1, Math.max(0, t));
  const [r1, g1, b1] = hexRgb(SURVIVAL_LOW);
  const [r2, g2, b2] = hexRgb(SURVIVAL_HIGH);
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * x);
  return `rgb(${lerp(r1, r2)}, ${lerp(g1, g2)}, ${lerp(b1, b2)})`;
};
