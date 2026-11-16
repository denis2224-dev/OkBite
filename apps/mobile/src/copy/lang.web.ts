export type Language = 'ro' | 'ru' | 'en';
const key = 'okbite.lang';
export const languageSelectable: boolean = true;

const isLanguage = (value: string | null): value is Language =>
  value === 'ro' || value === 'ru' || value === 'en';

export function getLanguage(): Language {
  let saved: string | null = null;
  try { saved = window.localStorage.getItem(key); } catch {}
  // First launch defaults to Romanian for Moldova users even on English/Russian device locales.
  const language: Language = isLanguage(saved) ? saved : 'ro';
  if (typeof document !== 'undefined') document.documentElement.lang = language;
  return language;
}

export function setLanguage(language: Language): void {
  if (!isLanguage(language)) throw new TypeError('Unsupported language');
  // A failed save must not reload into the old preference.
  window.localStorage.setItem(key, language);
  document.documentElement.lang = language;
  window.location.reload();
}
