import { shelves } from './shelves';
import { topShelves } from './topShelves';

it('offers the shelves in their order, without fruits and vegetables', () => {
  expect(topShelves.map(shelf => shelf.slug)).toEqual(shelves.map(shelf => shelf.slug).filter(slug => slug !== 'fructe-legume'));
  expect(topShelves[0]!.slug).toBe('iaurt');
  expect(topShelves.some(shelf => shelf.slug === 'fructe-legume')).toBe(false);
  expect(topShelves.some(shelf => (shelf.slug as string) === 'necunoscut')).toBe(false);
});
