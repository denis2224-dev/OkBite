import { ro } from '../../copy/ro';
import { fold, matchShelves, quickShelves, visibleShelves } from './searchShelves';
import { topShelves } from './topShelves';

const slugs = (list: readonly { slug: string }[]) => list.map(shelf => shelf.slug);

it('offers five everyday types by default, in a fixed order, all of them real types', () => {
  expect(slugs(quickShelves)).toEqual(['iaurt', 'biscuiti', 'suc', 'paine', 'lapte']);
  for (const shelf of quickShelves) expect(topShelves).toContain(shelf);
});

it('folds case and diacritics so "painea" and "BRANZA" still match', () => {
  expect(fold('Pâine Brânză ȘȚ')).toBe('paine branza st');
  expect(slugs(matchShelves('PAINE', ro.scan.shelf.names))).toContain('paine');
  expect(slugs(matchShelves('branza', ro.scan.shelf.names))).toEqual(['branza']);
});

it('matches anywhere in the name, ignores blanks around the text, and finds nothing for nonsense', () => {
  expect(slugs(matchShelves('  smant ', ro.scan.shelf.names))).toEqual(['unt-si-smantana']);
  expect(slugs(matchShelves('mezeluri', ro.scan.shelf.names))).toEqual(['mezeluri', 'mezeluri-pasare']);
  expect(matchShelves('zzzz', ro.scan.shelf.names)).toEqual([]);
});

it('never offers fruits and vegetables', () => {
  expect(slugs(matchShelves('fructe', ro.scan.shelf.names))).not.toContain('fructe-legume');
});

describe('visibleShelves', () => {
  it('is the five quick types with no search', () => {
    expect(slugs(visibleShelves('', 'iaurt', ro.scan.shelf.names))).toEqual(slugs(quickShelves));
    expect(slugs(visibleShelves('   ', 'lapte', ro.scan.shelf.names))).toEqual(slugs(quickShelves));
  });
  it('keeps a chosen type that is not a quick one in view, still five chips in all', () => {
    const list = visibleShelves('', 'cereale', ro.scan.shelf.names);
    expect(slugs(list)).toEqual(['cereale', 'iaurt', 'biscuiti', 'suc', 'paine']);
  });
  it('is the matches while searching', () => {
    expect(slugs(visibleShelves('lapte', 'iaurt', ro.scan.shelf.names))).toEqual(['lapte']);
  });
});
