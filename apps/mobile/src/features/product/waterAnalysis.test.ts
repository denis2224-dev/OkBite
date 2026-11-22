import { emptyWaterProfile, type WaterProfile } from '@okbite/shared';
import {
  buildWaterComposition,
  classifyMineral,
  deriveGoodForTags,
  deriveWaterTaste,
  getEffectivePh,
} from './waterAnalysis';

const daviDanWater: WaterProfile = {
  ...emptyWaterProfile(),
  dryResidueMgL: 390,
  carbonation: 'sparkling',
  classification: 'drinking',
  caMgL: 14,
  mgMgL: 42.6,
  no3MgL: 6.4,
};

describe('waterAnalysis', () => {
  it('estimates approximate acidic pH on sparkling and lightly sparkling waters without printed pH', () => {
    expect(getEffectivePh(daviDanWater)).toEqual({
      value: 5.5,
      isApprox: true,
      display: '≈ 5,5',
      pill: 'pH ≈ 5,5',
      level: 'acidic',
      dots: 1,
      tone: 'warn',
    });

    expect(
      getEffectivePh({ ...emptyWaterProfile(), carbonation: 'lightly_sparkling' })?.pill,
    ).toBe('pH ≈ 6');

    expect(getEffectivePh({ ...emptyWaterProfile(), carbonation: 'still' })).toBeNull();
    expect(getEffectivePh({ ...daviDanWater, ph: 7.4 })).toMatchObject({
      value: 7.4,
      isApprox: false,
      pill: 'pH 7,4',
      level: 'neutral',
      tone: 'good',
    });
  });

  it('derives taste profile and good-for chips from chemistry without therapeutic overclaiming', () => {
    expect(deriveWaterTaste(daviDanWater)).toEqual({ index: 1, key: 'soft' });
    expect(deriveGoodForTags(daviDanWater)).toEqual({
      caution: false,
      tags: ['teaCoffee'],
    });

    const donat: WaterProfile = {
      ...emptyWaterProfile(),
      tdsMgL: 13000,
      carbonation: 'sparkling',
      classification: 'therapeutic',
      naMgL: 1570,
    };
    expect(deriveWaterTaste(donat)).toEqual({ index: 4, key: 'salty_intense' });
    expect(deriveGoodForTags(donat)).toEqual({ caution: true, tags: [] });
  });

  it('builds 4/11 Scanly-aligned composition for DaviDan while preserving approx pH and 6 missing slots', () => {
    const comp = buildWaterComposition(daviDanWater);
    expect(comp.declaredCount).toBe(4);
    expect(comp.totalStandardCount).toBe(11);
    expect(comp.phRow?.pill).toBe('pH ≈ 5,5');
    expect(comp.mineralRows.map((r) => [r.key, r.displayValue, r.level])).toEqual([
      ['dryResidueMgL', '390 mg/l', 'low_mineral'],
      ['mgMgL', '42,6 mg/l', 'ordinary'],
      ['caMgL', '14 mg/l', 'low'],
      ['no3MgL', '6,4 mg/l', 'low'],
    ]);
    expect(comp.missingKeys).toEqual(['kMgL', 'so4MgL', 'clMgL', 'fMgL', 'naMgL', 'hco3MgL']);
  });

  it('keeps explicit zero nitrates classified as very_low and neutral/good', () => {
    expect(classifyMineral('no3MgL', 0)).toEqual({
      level: 'very_low',
      dots: 1,
      tone: 'good',
    });
  });
});
