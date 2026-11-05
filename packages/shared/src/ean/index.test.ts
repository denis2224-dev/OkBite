import { describe, expect, it } from 'vitest';
import { normalizeCode } from './index';

describe('normalizeCode', () => {
  it.each([
    ['4840001000014', '4840001000014'],
    ['036000291452', '0036000291452'],
    ['4840001000017', null],
    ['96385074', '96385074'],
    [' 4840001 000014 ', '4840001000014'],
    ['abc', null],
    ['', null],
    ['036000291453', null],
    ['12345', null],
  ])('normalizeCode(%s)', (raw, out) => expect(normalizeCode(raw)).toBe(out));
});
