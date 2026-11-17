import categories from '../../../../../data/categories.json';
import { roStrings } from '../../copy/strings.ro';
import { en } from '../../copy/strings.en';
import { ru } from '../../copy/strings.ru';
import { shelves } from './shelves';

const slugs = shelves.map(shelf => shelf.slug);

it('starts with the eight everyday shelves, then the rest in file order, without the unknown category', () => {
  const first = ['iaurt', 'biscuiti', 'suc', 'paine', 'fructe-legume', 'lapte', 'branza', 'cereale'];
  const rest = categories.map(category => category.slug).filter(slug => slug !== 'necunoscut' && !first.includes(slug));
  expect(slugs).toEqual([...first, ...rest]);
  expect(slugs).toHaveLength(25);
});

it('gives the first eight shelves their own icon', () => {
  expect(new Set(shelves.slice(0, 8).map(shelf => shelf.icon)).size).toBe(8);
});

it('names every shelf in Romanian, English and Russian; Romanian matches the category list', () => {
  for (const { slug, name } of categories.filter(category => category.slug !== 'necunoscut')) {
    expect(roStrings.scan.shelf.names[slug as keyof typeof roStrings.scan.shelf.names]).toBe(name);
  }
  for (const copy of [roStrings, en, ru]) expect(Object.keys(copy.scan.shelf.names).sort()).toEqual([...slugs].sort());
  for (const slug of slugs) { expect(en.scan.shelf.names[slug]).toBeTruthy(); expect(ru.scan.shelf.names[slug]).toMatch(/[а-яё]/i); }
});
