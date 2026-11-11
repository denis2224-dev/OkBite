import type { Letter } from '@okbite/shared';

type Tone = { fg: string; bg: string };
export type LetterTones = Record<Letter, Tone> & { onSelected: string };

/** Our own A–E scale colours (not the official logo). Every fg/bg pair is at least 5.3:1. */
export const letterTones: { light: LetterTones; dark: LetterTones } = {
  light: {
    A: { fg: '#1F6B3A', bg: '#D9EDD9' }, B: { fg: '#3F6B12', bg: '#E6F0D2' }, C: { fg: '#6E5200', bg: '#FBEFC9' },
    D: { fg: '#93440B', bg: '#FBE2CC' }, E: { fg: '#9B2C1F', bg: '#F8DAD5' }, onSelected: '#FFFFFF',
  },
  dark: {
    A: { fg: '#9FD8A8', bg: '#1E3B28' }, B: { fg: '#C8E07A', bg: '#2E3A1A' }, C: { fg: '#FFE08A', bg: '#3F3618' },
    D: { fg: '#FFB98A', bg: '#47301C' }, E: { fg: '#FFA99C', bg: '#4A2622' }, onSelected: '#0F1F17',
  },
};
