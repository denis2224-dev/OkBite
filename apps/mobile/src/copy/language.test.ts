import { en } from './strings.en';
import { roStrings } from './strings.ro';

afterEach(() => { jest.resetModules(); jest.dontMock('./lang'); });

test('existing ro consumers receive English when English is selected', () => {
  jest.doMock('./lang', () => ({ getLanguage: () => 'en' }), { virtual: true });
  const { ro } = jest.requireActual<typeof import('./ro')>('./ro');
  expect(ro.history.clear).toBe('Clear history');
  expect(ro.capture.gallery).toBe('Choose from gallery');
  expect(ro.score.disclaimer).toBe('Calculated per 100 g; does not indicate disease risk.');
});

function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shape(item)]));
  return typeof value;
}
test('English provides every nested key, list item and formatter used by Romanian consumers', () => {
  expect(shape(en)).toEqual(shape(roStrings));
});
test('Romanian remains the native default and keeps its plural rules', () => {
  const { ro, plural } = jest.requireActual<typeof import('./ro')>('./ro');
  expect(ro.history.clear).toBe('Șterge istoricul');
  expect(plural(20, 'produs', 'produse')).toBe('20 de produse');
});
test.each([1, 2, 20, 101, 120])('English count formatters avoid Romanian grammar for %i', n => {
  expect(en.history.count(n)).toBe(`${n} ${n === 1 ? 'product' : 'products'}`);
  expect(en.offline.pendingCount(n)).toBe(`Pending: ${n} ${n === 1 ? 'product' : 'products'}`);
});
test('translated formatters retain values and units', () => {
  expect(en.add.stepOf(2, 3)).toBe('Step 2 of 3');
  expect(en.result.portionAmount('13,2', 'g')).toBe('Portion: 13,2 g');
  expect(en.score.ringLabel(78, 'good')).toBe('78 out of 100, good nutritional quality');
  expect(en.compare.design.table('ml')).toBe('Comparison table per 100 millilitres');
  expect(en.share.score(13.2)).toBe('13,2 out of 100');
});
