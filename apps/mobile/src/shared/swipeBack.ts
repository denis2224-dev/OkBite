/** A rightward pull from the left edge goes back when it is long, or short but quick, and mostly sideways. */
export function shouldGoBack(dx: number, dy: number, vx: number): boolean {
  if (dx <= 0 || Math.abs(dy) > dx) return false;
  return dx > 60 || (dx > 20 && vx > 0.5);
}
