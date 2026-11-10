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
test.each(['ro-MD', 'ru', 'fr', ''])('defaults to Romanian for browser language %s', language => {
  Object.assign(navigator, { language });
  expect(getLanguage()).toBe('ro');
  expect(document.documentElement.lang).toBe('ro');
});
test.each(['en', 'en-GB', 'en-US'])('uses English for browser language %s', language => {
  Object.assign(navigator, { language });
  expect(getLanguage()).toBe('en');
  expect(document.documentElement.lang).toBe('en');
});
test.each([['en', 'ro-MD'], ['ro', 'en-US']])('saved %s overrides browser %s', (saved, browser) => {
  storage.set('okbite.lang', saved); Object.assign(navigator, { language: browser });
  expect(getLanguage()).toBe(saved);
});
test('invalid saved data falls back to browser preference', () => {
  storage.set('okbite.lang', 'invalid'); Object.assign(navigator, { language: 'en-GB' });
  expect(getLanguage()).toBe('en');
});
test('blocked localStorage still allows reading the browser preference', () => {
  Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('blocked'); } });
  Object.assign(navigator, { language: 'en-GB' });
  expect(getLanguage()).toBe('en');
});
test('static export and native use Romanian without browser globals', () => {
  for (const key of Object.keys(originals)) Reflect.deleteProperty(globalThis, key);
  expect(getLanguage()).toBe('ro');
  expect(jest.requireActual<typeof import('./lang')>('./lang').getLanguage()).toBe('ro');
});
test('saves a choice before reloading and updates document language', () => {
  reload.mockImplementation(() => expect(storage.get('okbite.lang')).toBe('en'));
  setLanguage('en');
  expect(getLanguage()).toBe('en');
  expect(document.documentElement.lang).toBe('en');
  expect(reload).toHaveBeenCalledTimes(1);
});
test('refuses an invalid choice without changing storage or reloading', () => {
  expect(() => setLanguage('ru' as 'en')).toThrow();
  expect(storage.size).toBe(0); expect(reload).not.toHaveBeenCalled();
});
test('failed persistence never reloads into an unsaved language', () => {
  Object.assign(window.localStorage, { setItem: () => { throw new Error('full'); } });
  expect(() => setLanguage('en')).toThrow('full');
  expect(reload).not.toHaveBeenCalled();
});
