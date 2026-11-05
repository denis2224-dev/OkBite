import type { Nutrients, ScoreKind, ScoreResult } from '../contract';

// C3-only placeholder. R3/C4 must replace this before C6 acceptance.
export function computeScore(_nutrients: Nutrients, _kind: ScoreKind): ScoreResult {
  return { score: null, letter: null, grade: 'unavailable', reasons: [], missing: [] };
}
