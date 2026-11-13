export type Language = 'ro' | 'en';
export function getLanguage(): Language { return 'ro'; }
// Native language selection is deferred by N17; the PWA persists its choice.
export const languageSelectable: boolean = false;
export function setLanguage(_language: Language): void {}
