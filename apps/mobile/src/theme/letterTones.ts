import type { Letter } from '@okbite/shared';

type Tone = { fg: string; bg: string };
export type LetterTones = Record<Letter, Tone> & { onSelected: string };

/** Our own A–E scale colours (not the official logo). Every fg/bg pair is at least 5.3:1. Light only. */
export const letterTones: LetterTones = {
  A: { fg: '#1F6B3A', bg: '#D9EDD9' }, B: { fg: '#3F6B12', bg: '#E6F0D2' }, C: { fg: '#6E5200', bg: '#FBEFC9' },
  D: { fg: '#93440B', bg: '#FBE2CC' }, E: { fg: '#9B2C1F', bg: '#F8DAD5' }, onSelected: '#FFFFFF',
};
