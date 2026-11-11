import { getLanguage } from './lang';
import { en } from './strings.en';
import { roStrings, plural as formatPlural, type Copy } from './strings.ro';

export const ro: Copy = getLanguage() === 'en' ? en : roStrings;
export type { Copy } from './strings.ro';
export function plural(n: number, one: string, many: string): string {
  return formatPlural(n, one, many, getLanguage());
}
