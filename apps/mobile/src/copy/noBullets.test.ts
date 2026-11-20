import { en } from './strings.en';
import { roStrings } from './strings.ro';
import { ru } from './strings.ru';

// Visible copy has no bullet or middle-dot separators; a comma, a new line or spacing does that job.
const strings = (value: unknown, out: string[] = []): string[] => {
  if (typeof value === 'string') out.push(value);
  else if (typeof value === 'function') {
    try { const called = (value as (...args: unknown[]) => unknown)('Gluten', 'g', 1, 2); if (typeof called === 'string') out.push(called); } catch { /* needs other arguments */ }
  } else if (value && typeof value === 'object') Object.values(value).forEach(item => strings(item, out));
  return out;
};
it.each([['en', en], ['ro', roStrings], ['ru', ru]] as const)('has no bullet or middle dot in %s copy', (_, copy) => {
  expect(strings(copy).filter(text => /[•·]/.test(text))).toEqual([]);
});
