import type { Shelf, ShelfSlug } from './shelves';
import { topShelves } from './topShelves';

/** The five everyday types shown without searching: the first of the app's own shelf order (fruits and vegetables are not offered). */
export const quickShelves: readonly Shelf[] = topShelves.slice(0, 5);

/** Lower case with no accents, so "painea", "PÂINE" and "paine" all compare equal. */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** The types whose name contains the typed text; the text is trimmed and compared without case or accents. */
export function matchShelves(query: string, names: Record<ShelfSlug, string>): readonly Shelf[] {
  const wanted = fold(query.trim());
  return topShelves.filter(shelf => fold(names[shelf.slug]).includes(wanted));
}

/** What the chip strip shows: the matches while searching, else the five quick types with the chosen type pinned first if it is not one of them. */
export function visibleShelves(query: string, chosen: ShelfSlug, names: Record<ShelfSlug, string>): readonly Shelf[] {
  if (query.trim()) return matchShelves(query, names);
  if (quickShelves.some(shelf => shelf.slug === chosen)) return quickShelves;
  const pinned = topShelves.find(shelf => shelf.slug === chosen);
  return pinned ? [pinned, ...quickShelves.slice(0, quickShelves.length - 1)] : quickShelves;
}
