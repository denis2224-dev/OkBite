/** A rightward pull from the left edge goes back when it is long, or short but quick, and mostly sideways. */
export function shouldGoBack(dx: number, dy: number, vx: number): boolean {
  if (dx <= 0 || Math.abs(dy) > dx) return false;
  return dx > 60 || (dx > 20 && vx > 0.5);
}

// The four pages on the bottom bar: their own tabs are the way around, so no swipe-back there.
const navBarPages = new Set(['/', '/history', '/compare', '/profile']);

// Settings and About are tab routes (opened from Profil), so the stack's own back gesture does not reach them.
const tabRoutes = new Set(['/settings', '/about']);

/** Whether the app draws its own swipe strip here. On iPhone and Android the stack's native swipe-back already follows the
 * finger on every page that was pushed, so the strip is only for the tab routes above and for the web. */
export function usesCustomSwipe(pathname: string, platform: string): boolean {
  return swipeBackEnabled(pathname) && (platform === 'web' || tabRoutes.has(pathname));
}

/** Swipe-back is on only for pages opened from somewhere (a product, Setări, capture…), not on nav-bar pages. */
export function swipeBackEnabled(pathname: string): boolean {
  return !navBarPages.has(pathname);
}
