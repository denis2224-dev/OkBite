import { roStrings } from './strings.ro';
import { en } from './strings.en';
import { ru } from './strings.ru';

// Storage and offline notes that repeated what the shopper already knows were removed from every screen.
const removed = ['offline.cached', 'offline.description', 'history.empty', 'compare.design.hint'];
const get = (object: unknown, path: string): unknown => path.split('.').reduce<unknown>((value, key) => (value as Record<string, unknown> | undefined)?.[key], object);

it.each(removed)('no longer ships %s in any language', path => {
  for (const strings of [roStrings, en, ru]) expect(get(strings, path)).toBeUndefined();
});
