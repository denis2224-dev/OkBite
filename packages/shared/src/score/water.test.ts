import { describe, expect, it } from 'vitest';
import type { Nutrients, WaterProfile } from '../contract';
import { computeWaterScore, productScore, scoreProductNutrition, summarizeWater } from './index';

const emptyWater: WaterProfile = {
  tdsMgL: null, dryResidueMgL: null, ph: null, carbonation: null, classification: null,
  caMgL: null, mgMgL: null, naMgL: null, kMgL: null, naPlusKMgL: null,
  hco3MgL: null, so4MgL: null, clMgL: null, fMgL: null, no3MgL: null,
  bMgL: null, h3bo3MgL: null, iUgL: null,
};

const emptyNutrients: Nutrients = {
  kcal: null, fat: null, sat: null, sugar: null, salt: null, protein: null, fiber: null, fruitVegPct: null,
};

const w = (over: Partial<WaterProfile>): WaterProfile => ({ ...emptyWater, ...over });

describe('computeWaterScore (Moldova & imported retail calibration)', () => {
  it('scores Aqua Carpatica, Evian, Dorna still, and Acqua Panna in 96–100 (daily_low_sodium)', () => {
    const aquaCarpatica = w({ tdsMgL: 200, ph: 8.2, carbonation: 'still', classification: 'natural_mineral', caMgL: 52, mgMgL: 17, hco3MgL: 220, no3MgL: 0.9, naMgL: 0.7 });
    const dornaStill = w({ dryResidueMgL: 196, ph: 7.8, carbonation: 'still', classification: 'natural_mineral', caMgL: 63.24, mgMgL: 2.1, naMgL: 0.95, clMgL: 4.8, no3MgL: 3.9 });
    const evian = w({ dryResidueMgL: 345, ph: 7.2, carbonation: 'still', classification: 'natural_mineral', caMgL: 80, mgMgL: 26, naMgL: 6.5, hco3MgL: 360, so4MgL: 14, clMgL: 10 });
    for (const profile of [aquaCarpatica, dornaStill, evian]) {
      const res = computeWaterScore(profile);
      expect(res.letter).toBeNull();
      expect(res.grade).toBe('good');
      expect(res.score).toBeGreaterThanOrEqual(96);
      expect(res.score).toBeLessThanOrEqual(100);
      expect(summarizeWater(profile).tier).toBe('daily_low_sodium');
    }
  });

  it('scores OM Plată (combined Na+K, missing pH), Apă Bună, and Bucovina high for everyday drinking', () => {
    const omPlata = w({ tdsMgL: 375, dryResidueMgL: 305, carbonation: 'still', classification: 'drinking', caMgL: 32.5, mgMgL: 12.5, naPlusKMgL: 72.5, hco3MgL: 140, clMgL: 15.5 });
    const apaBuna = w({ tdsMgL: 451, ph: 7.4, carbonation: 'still', classification: 'drinking', caMgL: 75.1, mgMgL: 8.4, naMgL: 25.9, kMgL: 3.4, hco3MgL: 246, so4MgL: 67, clMgL: 7.7, fMgL: 0.47, no3MgL: 1.5 });
    const bucovina = w({ dryResidueMgL: 78, carbonation: 'still', classification: 'natural_mineral', caMgL: 9.85, mgMgL: 2.55, naMgL: 2.84, kMgL: 1.18, hco3MgL: 48.8, so4MgL: 5.89, clMgL: 3.55, fMgL: 0.048, no3MgL: 5.01 });

    const omScore = computeWaterScore(omPlata);
    expect(omScore.score).toBeGreaterThanOrEqual(88);
    expect(omScore.score).toBeLessThanOrEqual(96);
    expect(summarizeWater(omPlata).tier).toBe('daily');
    expect(summarizeWater(omPlata).lowSodium).toBe(false);

    expect(computeWaterScore(apaBuna).score).toBeGreaterThanOrEqual(90);
    expect(computeWaterScore(bucovina).score).toBeGreaterThanOrEqual(92);
  });

  it('keeps Magnesia high-magnesium low-sodium daily positive without falsely conflating with saline waters', () => {
    const magnesia = w({ tdsMgL: 736, carbonation: 'still', classification: 'natural_mineral', mgMgL: 172, naMgL: 5.2 });
    const res = computeWaterScore(magnesia);
    expect(res.score).toBeGreaterThanOrEqual(88);
    expect(summarizeWater(magnesia).magnesiumRich).toBe(true);
    expect(res.reasons.some((r) => r.tone === 'good')).toBe(true);
  });

  it('separates Dorna Carbogazoasă from Dorna Plată without penalizing CO2-lowered pH above 4.5', () => {
    const dornaCarb = w({ dryResidueMgL: 886.5, ph: 5.64, carbonation: 'sparkling', classification: 'natural_mineral', caMgL: 297, mgMgL: 9.7, naMgL: 21.9, hco3MgL: 960, clMgL: 5.6 });
    const res = computeWaterScore(dornaCarb);
    expect(res.score).toBeGreaterThanOrEqual(76);
    expect(res.score).toBeLessThanOrEqual(86);
    expect(summarizeWater(dornaCarb).tier).toBe('moderate_sport');
  });

  it('keeps RESAN moderate/fair and drops high-salt/sulfate Gura Căinarului & Nabeghlavi to occasional low scores', () => {
    const resan = w({ tdsMgL: 1260, ph: 7.9, caMgL: 56.8, mgMgL: 114, naPlusKMgL: 113.4, hco3MgL: 510, so4MgL: 349, clMgL: 58.2, classification: 'table_mineral' });
    const guraPlata = w({ ph: 5.84, carbonation: 'still', classification: 'natural_mineral', caMgL: 230, mgMgL: 113, naMgL: 395, kMgL: 20, hco3MgL: 680, so4MgL: 1140 });
    const nabeghlavi = w({ tdsMgL: 3900, carbonation: 'sparkling', classification: 'table_mineral', caMgL: 58, mgMgL: 65.5, naMgL: 834, fMgL: 0.22 });

    expect(computeWaterScore(resan).score).toBeGreaterThanOrEqual(52);
    expect(computeWaterScore(resan).score).toBeLessThanOrEqual(68);
    expect(computeWaterScore(guraPlata).score).toBeLessThanOrEqual(40);
    expect(summarizeWater(guraPlata).tier).toBe('occasional_high_mineral');
    expect(computeWaterScore(nabeghlavi).score).toBeLessThanOrEqual(35);
  });

  it('caps therapeutic waters (Donat Mg ion-sum fallback, Essentuki 4/17, Polyana Kvasova g/L-typo guard) at <= 40', () => {
    const donatMg = w({ carbonation: 'sparkling', classification: 'natural_mineral', caMgL: 430, mgMgL: 1000, naMgL: 1700, hco3MgL: 7400, so4MgL: 2200, clMgL: 90 });
    const essentuki4 = w({ tdsMgL: 8500, classification: 'therapeutic', caMgL: 80, mgMgL: 35, naPlusKMgL: 2500, hco3MgL: 4125, so4MgL: 15, clMgL: 1650, h3bo3MgL: 45 });
    const polyanaTypo = w({ tdsMgL: 9.25, carbonation: 'sparkling', classification: 'therapeutic', caMgL: 110, naMgL: 2250, hco3MgL: 6250, clMgL: 450, h3bo3MgL: 175 });

    for (const med of [donatMg, essentuki4, polyanaTypo]) {
      const res = computeWaterScore(med);
      expect(res.score).not.toBeNull();
      expect(res.score!).toBeLessThanOrEqual(40);
      expect(res.grade).toBe('low');
      expect(summarizeWater(med).tier).toBe('therapeutic');
      expect(res.reasons.some((r) => r.tone === 'bad')).toBe(true);
    }
  });

  it('withholds numeric score for pH-only or missing-TDS records (Alcalia pH 9.37, empty profile)', () => {
    const alcaliaOnlyPh = w({ ph: 9.37, carbonation: 'still', classification: 'natural_mineral' });
    expect(computeWaterScore(alcaliaOnlyPh)).toEqual({
      score: null, letter: null, grade: 'unavailable', reasons: [], missing: [],
    });
    expect(computeWaterScore(null).grade).toBe('unavailable');
    expect(computeWaterScore(emptyWater).grade).toBe('unavailable');
  });

  it('uses water chemical score directly inside productScore and scoreProductNutrition without 60/30/10 food distortion', () => {
    const donat = w({ caMgL: 430, mgMgL: 1000, naMgL: 1700, hco3MgL: 7400, so4MgL: 2200, classification: 'therapeutic' });
    const score = scoreProductNutrition({ category: { scoreKind: 'water' }, nutrients: emptyNutrients, ingredientsText: '', water: donat });
    expect(score.score).toBeLessThanOrEqual(40);
    const final = productScore({ nutrients: emptyNutrients, category: { scoreKind: 'water' }, ingredientsText: '', ingredients: [], water: donat }, score);
    expect(final.score).toBe(score.score);
    expect(final.deductions).toEqual([]);
  });
});
