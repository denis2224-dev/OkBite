import { getLanguage } from './lang';
import { en } from './strings.en';
import { roStrings, plural as formatPlural, type Copy } from './strings.ro';
import { ru } from './strings.ru';

const copies = { ro: roStrings, ru, en } as const;
export const ro: Copy = copies[getLanguage()];
export type { Copy } from './strings.ro';
export function plural(n: number, one: string, many: string): string {
  return formatPlural(n, one, many, getLanguage());
}
