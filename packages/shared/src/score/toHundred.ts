import type { Letter, ScoreKind } from '../contract';
import { LETTER_CUTOFFS, POINTS_RANGE } from './nutriscore';

// Spec §4: A 100…80, B 79…60, C 59…40, D 39…20, E 19…0, linear inside the band's points range.
const SCORES: Record<Letter, [number, number]> = { A: [100, 80], B: [79, 60], C: [59, 40], D: [39, 20], E: [19, 0] };

export function toHundred(points: number, letter: Letter, kind: ScoreKind): number {
  if (kind === 'water') return 100;
  const [a, b, c, d] = LETTER_CUTOFFS[kind];
  const [min, max] = POINTS_RANGE[kind];
  // Open ends use the kind's minimum/maximum points; beverages have no A, so their B starts at the minimum.
  const bands: Record<Letter, [number, number]> = {
    A: [min, a], B: [Math.max(min, a + 1), b], C: [b + 1, c], D: [c + 1, d], E: [d + 1, max],
  };
  const [bandMin, bandMax] = bands[letter];
  const [top, bottom] = SCORES[letter];
  if (bandMax <= bandMin) return top;
  const p = Math.min(Math.max(points, bandMin), bandMax);
  return top - Math.round(((p - bandMin) / (bandMax - bandMin)) * (top - bottom));
}
