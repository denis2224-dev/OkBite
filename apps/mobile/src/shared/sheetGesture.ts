/** A downward pull on a bottom sheet closes it when it is long, or short but quick. */
export function shouldDismiss(dy: number, vy: number): boolean {
  return dy > 120 || (dy > 24 && vy > 0.8);
}

/** Whether a bottom sheet takes a move as its own drag: a clear downward, mostly vertical pull, and only while its content is scrolled to the top (otherwise the content scrolls). An upward move is never taken: the sheet does not lift. */
export function claimsSheetDrag(dx: number, dy: number, scrollY: number): boolean {
  return dy > 4 && dy > Math.abs(dx) && scrollY <= 0;
}

/** How far down the sheet sits for a pull of `dy`: it follows the finger down and stays put when pulled up. */
export function sheetOffset(dy: number): number {
  return Math.max(0, dy);
}
