import { describe, expect, it } from 'vitest';
import { normalizeCode, codeValidationError } from './index';

describe('normalizeCode', () => {
  it.each([
    ['4840001000014', '4840001000014'],
    ['036000291452', '0036000291452'],
    ['4840001000017', null],
    ['4840022010013', null],
    ['5449000000997', null],
    ['96385074', '96385074'],
    [' 4840001 000014 ', '4840001000014'],
    ['abc', null],
    ['', null],
    ['036000291453', null],
    ['12345', null],
  ])('normalizeCode(%s)', (raw, out) => expect(normalizeCode(raw)).toBe(out));
});

describe('codeValidationError', () => {
  it.each([
    ['12345', 'format'], ['abc', 'format'], ['9638507x', 'format'],
    ['4840022010013', 'checksum'], ['5449000000997', 'checksum'],
    ['96385075', 'checksum'], ['036000291453', 'checksum'],
    ['96385074', null], ['4840001000014', null], ['036000291452', null],
    [' 4840001 000014 ', null],
  ])('classifies %s as %s', (raw, reason) => {
    expect(codeValidationError(raw)).toBe(reason);
  });
});
