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

describe('computeWaterScore (adaptive evidence & bounded interval calibration)', () => {
  it('returns an exact single 0–100 score when full chemistry or mass conservation determines all penalties', () => {
    const aquaCarpatica = w({ tdsMgL: 200, ph: 8.2, carbonation: 'still', classification: 'natural_mineral', caMgL: 52, mgMgL: 17, hco3MgL: 220, no3MgL: 0.9, naMgL: 0.7 });
    const apaBuna = w({ tdsMgL: 451, ph: 7.4, carbonation: 'still', classification: 'drinking', caMgL: 75.1, mgMgL: 8.4, naMgL: 25.9, kMgL: 3.4, hco3MgL: 246, so4MgL: 67, clMgL: 7.7, fMgL: 0.47, no3MgL: 1.5 });
    const evianFull = w({ dryResidueMgL: 345, ph: 7.2, carbonation: 'still', classification: 'natural_mineral', caMgL: 80, mgMgL: 26, naMgL: 6.5, hco3MgL: 360, so4MgL: 14, clMgL: 10, fMgL: 0.1, no3MgL: 3.8 });

    for (const profile of [aquaCarpatica, evianFull]) {
      const res = computeWaterScore(profile);
      expect(res.letter).toBeNull();
      expect(res.grade).toBe('good');
      expect(res.score).toBeGreaterThanOrEqual(96);
      expect(res.score).toBeLessThanOrEqual(100);
      expect(res.range).toBeNull();
      expect(res.waterMissing).toEqual([]);
      expect(summarizeWater(profile).tier).toBe('daily_low_sodium');
    }
    const apaRes = computeWaterScore(apaBuna);
    expect(apaRes.score).toBe(98);
    expect(apaRes.range).toBeNull();
    expect(apaRes.waterMissing).toEqual([]);
  });

  it('never gives a TDS-only water 100/100 or a daily recommendation; outputs an honest estimated range', () => {
    const nordica = w({ tdsMgL: 350, ph: 7.5, carbonation: 'still', classification: 'drinking' });
    const res = computeWaterScore(nordica);
    expect(res.score).toBeNull();
    expect(res.range).toEqual({ min: 60, max: 100 });
    expect(res.grade).toBe('medium');
    expect(res.waterMissing).toContain('naMgL');
    expect(res.waterMissing).toContain('fMgL');
    expect(res.waterMissing).not.toContain('tdsMgL');
    expect(res.waterMissing).not.toContain('ph');
    expect(res.reasons.some((r) => r.tone === 'good' && /zilnic/i.test(r.title))).toBe(false);
  });

  it('bounds combined Na+K on OM Plată without inventing separate Na and reports uncertainty range', () => {
    const omPlata = w({
      tdsMgL: 375, dryResidueMgL: 305, carbonation: 'still', classification: 'drinking',
      caMgL: 32.5, mgMgL: 12.5, naPlusKMgL: 72.5, hco3MgL: 140, clMgL: 15.5,
      ranges: { tdsMgL: { min: 350, max: 400 }, naPlusKMgL: { min: 70, max: 75 }, caMgL: { min: 30, max: 35 }, mgMgL: { min: 10, max: 15 }, hco3MgL: { min: 130, max: 150 }, clMgL: { min: 13, max: 18 } },
    });
    const res = computeWaterScore(omPlata);
    expect(res.score).toBeNull();
    expect(res.range).not.toBeNull();
    expect(res.range!.min).toBeGreaterThanOrEqual(55);
    expect(res.range!.max).toBeLessThanOrEqual(100);
    expect(res.range!.min).toBeLessThan(res.range!.max);
    expect(res.waterMissing).toEqual(expect.arrayContaining(['ph', 'naMgL', 'fMgL']));
    expect(summarizeWater(omPlata).lowSodium).toBe(false);
  });

  it('widens score bounds when declared mineral ranges cross scoring thresholds or explicit 0 resolves uncertainty', () => {
    const thresholdCrossing = w({
      tdsMgL: 510, ph: 7.2, carbonation: 'still', classification: 'natural_mineral',
      caMgL: 50, mgMgL: 15, naMgL: 10, so4MgL: 240, no3MgL: 0, fMgL: 0, h3bo3MgL: 0,
      ranges: { tdsMgL: { min: 480, max: 540 }, so4MgL: { min: 200, max: 280 } },
    });
    const crossing = computeWaterScore(thresholdCrossing);
    expect(crossing.score).toBeNull();
    expect(crossing.range).toEqual({ min: 82, max: 100 });
    expect(crossing.waterMissing).toEqual([]);

    const explicitZeroSafe = w({
      tdsMgL: 300, ph: 7.2, carbonation: 'still', classification: 'drinking',
      caMgL: 40, mgMgL: 12, naMgL: 15, hco3MgL: 150, so4MgL: 20, clMgL: 10,
      fMgL: 0, no3MgL: 0, h3bo3MgL: 0,
    });
    const exactZero = computeWaterScore(explicitZeroSafe);
    expect(exactZero.score).toBe(100);
    expect(exactZero.range).toBeNull();
    expect(exactZero.waterMissing).toEqual([]);

    const missingTrace = w({ ...explicitZeroSafe, no3MgL: null });
    const uncertainTrace = computeWaterScore(missingTrace);
    expect(uncertainTrace.score).toBeNull();
    expect(uncertainTrace.range!.min).toBeLessThan(uncertainTrace.range!.max);
    expect(uncertainTrace.waterMissing).toContain('no3MgL');
  });

  it('keeps Magnesia high-Mg water distinct (bounded range without SO4, exact score with SO4) without conflating with saline waters', () => {
    const partialMagnesia = w({ tdsMgL: 736, carbonation: 'still', classification: 'natural_mineral', mgMgL: 172, naMgL: 5.2, fMgL: 0.1, no3MgL: 2, h3bo3MgL: 0, ph: 7.1 });
    const partialRes = computeWaterScore(partialMagnesia);
    expect(partialRes.score).toBeNull();
    expect(partialRes.range).toEqual({ min: 82, max: 98 });
    expect(partialRes.waterMissing).toContain('so4MgL');

    const fullMagnesia = w({ ...partialMagnesia, so4MgL: 20 });
    const res = computeWaterScore(fullMagnesia);
    expect(res.score).toBe(98);
    expect(summarizeWater(fullMagnesia).magnesiumRich).toBe(true);
    expect(res.reasons.some((r) => r.tone === 'good')).toBe(true);
  });

  it('caps therapeutic waters (Donat Mg ion-sum fallback, Essentuki 4, Polyana Kvasova g/L-typo guard) at <= 40', () => {
    const donatMg = w({ carbonation: 'sparkling', classification: 'natural_mineral', caMgL: 430, mgMgL: 1000, naMgL: 1700, hco3MgL: 7400, so4MgL: 2200, clMgL: 90 });
    const essentuki4 = w({ tdsMgL: 8500, classification: 'therapeutic', caMgL: 80, mgMgL: 35, naPlusKMgL: 2500, hco3MgL: 4125, so4MgL: 15, clMgL: 1650, h3bo3MgL: 45 });
    const polyanaTypo = w({ tdsMgL: 9.25, carbonation: 'sparkling', classification: 'therapeutic', caMgL: 110, naMgL: 2250, hco3MgL: 6250, clMgL: 450, h3bo3MgL: 175 });

    for (const med of [donatMg, essentuki4, polyanaTypo]) {
      const res = computeWaterScore(med);
      const upper = res.score ?? res.range?.max ?? 100;
      expect(upper).toBeLessThanOrEqual(40);
      expect(res.grade).toBe('low');
      expect(summarizeWater(med).tier).toBe('therapeutic');
      expect(res.reasons.some((r) => r.tone === 'bad')).toBe(true);
    }
  });

  it('withholds numeric score for pH-only or missing-TDS records (Alcalia pH 9.37, empty profile)', () => {
    const alcaliaOnlyPh = w({ ph: 9.37, carbonation: 'still', classification: 'natural_mineral' });
    expect(computeWaterScore(alcaliaOnlyPh)).toEqual({
      score: null, letter: null, grade: 'unavailable', reasons: [], missing: [], range: null, waterMissing: [], unverifiedUsed: false,
    });
    expect(computeWaterScore(null).grade).toBe('unavailable');
    expect(computeWaterScore(emptyWater).grade).toBe('unavailable');
  });

  it('tracks unverifiedUsed provenance accurately from product status and per-field evidence', () => {
    const partial = w({
      tdsMgL: 350, ph: 7.5, carbonation: 'still',
      evidence: {
        tdsMgL: { status: 'verified', source: 'nordica.md' },
        ph: { status: 'unverified', source: 'Fotografie utilizator' },
      },
    });
    expect(computeWaterScore(partial, 'verified').unverifiedUsed).toBe(true);
    expect(computeWaterScore(partial, 'unverified').unverifiedUsed).toBe(true);
    const allVerified = w({
      tdsMgL: 200, ph: 8.2, carbonation: 'still', classification: 'natural_mineral', caMgL: 52, mgMgL: 17, hco3MgL: 220, no3MgL: 0.9, naMgL: 0.7,
    });
    expect(computeWaterScore(allVerified, 'verified').unverifiedUsed).toBe(false);
    expect(computeWaterScore(allVerified, 'unverified').unverifiedUsed).toBe(true);
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
