import { ro, plural } from './ro';

it('has every section in order', () => {
  expect(Object.keys(ro)).toEqual(['app','nav','home','capture','identify','scan','result','score','ingredients','compare','add','review','history','offline','errors','share','legal']);
});

it('uses comma-below diacritics only', () => { expect(JSON.stringify(ro)).not.toMatch(/[şţŞŢ]/); });

it.each([[1, '1 produs'], [2, '2 produse'], [19, '19 produse'], [20, '20 de produse'], [101, '101 produse'], [120, '120 de produse']])(
  'plural %i', (n, s) => expect(plural(n, 'produs', 'produse')).toBe(s));

it('has the score disclaimer verbatim', () => {
  expect(ro.score.disclaimer).toBe('Calculat la 100 g; nu indică riscul unei boli.');
});

// Keys R1 and R5 already reference in their plans.
it.each([
  'home.title', 'home.photoButton', 'home.scanLink', 'capture.working', 'scan.manualInvalid',
  'scan.webManualOnly', 'result.scoreUnavailable', 'result.unverifiedNote', 'score.disclaimer',
  'ingredients.explanationSoon', 'compare.otherCategory', 'review.unclearField',
])('has %s', (path) => {
  const [section, key] = path.split('.');
  expect(typeof (ro as Record<string, Record<string, unknown>>)[section][key]).toBe('string');
});

it('labels the score ring for screen readers', () => {
  expect(ro.score.ringLabel(78, 'good')).toBe('78 din 100, calitate nutrițională bună');
  expect(ro.score.ringLabel(31, 'low')).toBe('31 din 100, calitate nutrițională scăzută');
});

it('has teaspoon texts', () => {
  expect(ro.result.teaspoons.underHalf).toBe('sub jumătate de linguriță');
  expect(ro.result.teaspoons.many('5')).toBe('5 lingurițe');
  expect(ro.result.teaspoons.many('2,5')).toBe('2,5 lingurițe');
  expect(ro.result.teaspoons.many('20')).toBe('20 de lingurițe');
});

it('has the browser manual-entry note verbatim', () => {
  expect(ro.scan.webManualOnly).toBe('În acest browser introdu codul de mână sau fotografiază produsul.');
});
