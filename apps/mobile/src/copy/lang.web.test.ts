import { getLanguage, setLanguage } from './lang.web';

const originals = Object.fromEntries(['window', 'navigator', 'document'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
let storage: Map<string, string>, reload: jest.Mock;
beforeEach(() => {
  storage = new Map(); reload = jest.fn();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) },
    location: { reload },
  } });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'ro-MD' } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { documentElement: { lang: '' } } });
});
afterEach(() => {
  for (const key of Object.keys(originals)) {
    const descriptor = originals[key];
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});
test.each(['ro-MD', 'ru', 'fr', 'en', 'en-GB', 'en-US', ''])('defaults to Romanian on first visit regardless of browser language %s', language => {
  Object.assign(navigator, { language });
  expect(getLanguage()).toBe('ro');
  expect(document.documentElement.lang).toBe('ro');
});
test.each([['en', 'ro-MD'], ['ru', 'en-US'], ['ro', 'en-US']])('saved %s overrides browser %s', (saved, browser) => {
  storage.set('okbite.lang', saved); Object.assign(navigator, { language: browser });
  expect(getLanguage()).toBe(saved);
});
test('invalid saved data falls back to Romanian', () => {
  storage.set('okbite.lang', 'invalid'); Object.assign(navigator, { language: 'en-GB' });
  expect(getLanguage()).toBe('ro');
});
test('blocked localStorage falls back to Romanian', () => {
  Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('blocked'); } });
  Object.assign(navigator, { language: 'en-GB' });
  expect(getLanguage()).toBe('ro');
});
test('static export and native use Romanian without browser globals', () => {
  for (const key of Object.keys(originals)) Reflect.deleteProperty(globalThis, key);
  expect(getLanguage()).toBe('ro');
  expect(jest.requireActual<typeof import('./lang')>('./lang').getLanguage()).toBe('ro');
});
test.each(['en', 'ru'] as const)('saves %s before reloading and updates document language', language => {
  reload.mockImplementation(() => expect(storage.get('okbite.lang')).toBe(language));
  setLanguage(language);
  expect(getLanguage()).toBe(language);
  expect(document.documentElement.lang).toBe(language);
  expect(reload).toHaveBeenCalledTimes(1);
});
test('refuses an invalid choice without changing storage or reloading', () => {
  expect(() => setLanguage('fr' as 'en')).toThrow();
  expect(storage.size).toBe(0); expect(reload).not.toHaveBeenCalled();
});
test('failed persistence never reloads into an unsaved language', () => {
  Object.assign(window.localStorage, { setItem: () => { throw new Error('full'); } });
  expect(() => setLanguage('en')).toThrow('full');
  expect(reload).not.toHaveBeenCalled();
});
