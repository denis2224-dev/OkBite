export type Language = 'ro' | 'en';
const key = 'okbite.lang';

export function getLanguage(): Language {
  let saved: string | null = null;
  try { saved = window.localStorage.getItem(key); } catch {}
  const language = saved === 'ro' || saved === 'en' ? saved
    : typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'ro';
  if (typeof document !== 'undefined') document.documentElement.lang = language;
  return language;
}

export function setLanguage(language: Language): void {
  if (language !== 'ro' && language !== 'en') throw new TypeError('Unsupported language');
  // A failed save must not reload into the old preference.
  window.localStorage.setItem(key, language);
  document.documentElement.lang = language;
  window.location.reload();
}
