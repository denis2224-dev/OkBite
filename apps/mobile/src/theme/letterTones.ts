import type { Letter } from '@okbite/shared';

type Tone = { fg: string; bg: string };
export type LetterTones = Record<Letter, Tone> & { onSelected: string };

/** Our own A–E scale in the Moss palette (not the official logo or colours). Every fg/bg pair is at least 4.5:1. Light only. */
export const letterTones: LetterTones = {
  A: { fg: '#2F5136', bg: '#E6EDE1' }, B: { fg: '#4A7343', bg: '#EEF2EA' }, C: { fg: '#7D5410', bg: '#F5EAD3' },
  D: { fg: '#9A4A2C', bg: '#F5E1D6' }, E: { fg: '#7E3322', bg: '#F2DAD3' }, onSelected: '#FFFFFF',
};
