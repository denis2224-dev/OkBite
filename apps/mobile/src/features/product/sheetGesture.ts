/** A downward pull on a bottom sheet closes it when it is long, or short but quick. */
export function shouldDismiss(dy: number, vy: number): boolean {
  return dy > 120 || (dy > 24 && vy > 0.8);
}
