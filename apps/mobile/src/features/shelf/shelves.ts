import type { Copy } from '../../copy/ro';
import type { ShelfIconName } from './ShelfIcon';

export type ShelfSlug = keyof Copy['scan']['shelf']['names'];
export type Shelf = { slug: ShelfSlug; icon: ShelfIconName };

/** The shelves in display order: eight everyday ones first, then the rest of data/categories.json in file order ("necunoscut" is left out). Names come from copy (`ro.scan.shelf.names`). */
export const shelves: readonly Shelf[] = [
  { slug: 'iaurt', icon: 'yogurt' },
  { slug: 'biscuiti', icon: 'biscuit' },
  { slug: 'suc', icon: 'juice' },
  { slug: 'paine', icon: 'bread' },
  { slug: 'fructe-legume', icon: 'apple' },
  { slug: 'lapte', icon: 'milk' },
  { slug: 'branza', icon: 'cheese' },
  { slug: 'cereale', icon: 'bowl' },
  { slug: 'unt-si-smantana', icon: 'basket' },
  { slug: 'ciocolata-si-dulciuri', icon: 'basket' },
  { slug: 'mezeluri', icon: 'basket' },
  { slug: 'mezeluri-pasare', icon: 'basket' },
  { slug: 'ulei', icon: 'bottle' },
  { slug: 'snacks-sarate', icon: 'basket' },
  { slug: 'bauturi-racoritoare', icon: 'bottle' },
  { slug: 'apa', icon: 'drop' },
  { slug: 'inghetata', icon: 'basket' },
  { slug: 'conserve', icon: 'basket' },
  { slug: 'sosuri-condimente', icon: 'bottle' },
  { slug: 'paste-fainoase', icon: 'basket' },
  { slug: 'peste-fructe-de-mare', icon: 'fish' },
  { slug: 'mancare-preparata', icon: 'basket' },
  { slug: 'nuci-seminte', icon: 'basket' },
  { slug: 'cafea-ceai', icon: 'cup' },
  { slug: 'bauturi-vegetale', icon: 'bottle' },
];
