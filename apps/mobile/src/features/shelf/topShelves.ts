import { shelves, type Shelf } from './shelves';

/** The types offered on the best products page: every shelf except fruits and vegetables, where all products are good so a top says nothing. */
export const topShelves: readonly Shelf[] = shelves.filter(shelf => shelf.slug !== 'fructe-legume');
