/** Presentation only; N4's shared tierFor will replace this when available. */
export function historyTier(score: number) {
  return score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : score >= 20 ? 'poor' : 'bad';
}
