import { describe, expect, it } from 'vitest';
import {
  detectWaterFrontHint,
  inferFrontWaterMeta,
  normalizeWaterObject,
  parseWaterCarbonation,
  parseWaterClassification,
  parseWaterValue,
  parseWaterValueWithRange,
} from './parseWater';

describe('parseWaterValue & normalizeWaterObject', () => {
  it('parses comma decimals, dot decimals, and Moldovan/CIS min-max ranges into scalar midpoints', () => {
    expect(parseWaterValue('350-400 mg/l')).toBe(375);
    expect(parseWaterValue('350 – 400')).toBe(375);
    expect(parseWaterValue('70 - 75 мг/л')).toBe(72.5);
    expect(parseWaterValue('7,4')).toBe(7.4);
    expect(parseWaterValue(451)).toBe(451);
  });

  it('converts g/L or g/dm3 to mg/L and mg/L iodine to ug/L cleanly', () => {
    expect(parseWaterValue('6,5-12 g/l')).toBe(9250);
    expect(parseWaterValue('1.26 г/дм3')).toBe(1260);
    expect(parseWaterValue('80 µg/l', 'i_ug')).toBe(80);
    expect(parseWaterValue('50-80 мкг/л', 'i_ug')).toBe(65);
    expect(parseWaterValue('0,125 mg/l', 'i_ug')).toBe(125);
  });

  it('handles lower/upper limit markers and rejects unreadable noise cleanly', () => {
    expect(parseWaterValue('< 0,05')).toBe(0.025);
    expect(parseWaterValue('≤ 50')).toBe(50);
    expect(parseWaterValue('> 1299')).toBe(1299);
    for (const bad of ['', '?', '-', '—', 'puțin', null, undefined, -5]) {
      expect(parseWaterValue(bad)).toBeNull();
    }
    expect(parseWaterValue('15', 'ph')).toBeNull();
    expect(parseWaterValue('8,2', 'ph')).toBe(8.2);
  });

  it('parses RO/RU/UA/EN carbonation and water classification strings', () => {
    expect(parseWaterCarbonation('Apă necarbogazoasă plată')).toBe('still');
    expect(parseWaterCarbonation('негазированная')).toBe('still');
    expect(parseWaterCarbonation('Slab carbogazificată')).toBe('lightly_sparkling');
    expect(parseWaterCarbonation('слабогазированная')).toBe('lightly_sparkling');
    expect(parseWaterCarbonation('Intens gazată')).toBe('sparkling');
    expect(parseWaterCarbonation('sparkling_natural')).toBe('sparkling');

    expect(parseWaterClassification('Apă minerală lecuitoare')).toBe('therapeutic');
    expect(parseWaterClassification('лечебно-столовая')).toBe('therapeutic');
    expect(parseWaterClassification('table_mineral')).toBe('table_mineral');
    expect(parseWaterClassification('Apă minerală naturală')).toBe('natural_mineral');
    expect(parseWaterClassification('Apă potabilă purificată')).toBe('drinking');
  });

  it('normalizes mixed OCR object & scrubs g/L contradiction (<50 TDS with >500 ion sum)', () => {
    const om = normalizeWaterObject({
      tdsMgL: '350-400 mg/l',
      dryResidueMgL: '290-320 mg/l',
      carbonation: 'plată',
      classification: 'apă potabilă',
      caMgL: '30-35',
      mgMgL: '10-15',
      naPlusKMgL: '70-75',
      hco3MgL: '130-150',
      clMgL: '13-18',
    });
    expect(om.tdsMgL).toBe(375);
    expect(om.dryResidueMgL).toBe(305);
    expect(om.naPlusKMgL).toBe(72.5);
    expect(om.carbonation).toBe('still');
    expect(om.classification).toBe('drinking');

    const polyanaBrokenTds = normalizeWaterObject({
      tdsMgL: '6,5-12',
      caMgL: '70-150',
      naMgL: '1500-3000',
      hco3MgL: '4500-8000',
      clMgL: '300-600',
      h3bo3MgL: '100-250',
      classification: 'medicinal-table',
    });
    expect(polyanaBrokenTds.tdsMgL).toBeNull();
    expect(polyanaBrokenTds.h3bo3MgL).toBe(175);
  });

  it('detects bottled water front names without matching sugary soft drinks', () => {
    expect(detectWaterFrontHint('OM', 'Apă potabilă plată')).toBe(true);
    expect(detectWaterFrontHint('Borjomi', 'Natural mineral water')).toBe(true);
    expect(detectWaterFrontHint('Ессентуки', 'Вода минеральная №4')).toBe(true);
    expect(detectWaterFrontHint('Coca-Cola', 'Băutură răcoritoare carbogazoasă')).toBe(false);
    expect(detectWaterFrontHint('Zorel', 'Iaurt cu căpșuni')).toBe(false);
  });

  it('preserves explicit 0, retains printed min-max intervals and <X upper bounds, and omits range for ?/blank', () => {
    expect(parseWaterValueWithRange('0 mg/l')).toEqual({ value: 0 });
    expect(parseWaterValueWithRange(0)).toEqual({ value: 0 });
    expect(parseWaterValueWithRange('0', 'ph')).toEqual({ value: 0 });
    expect(parseWaterValueWithRange('350-400 mg/l')).toEqual({ value: 375, range: { min: 350, max: 400 } });
    expect(parseWaterValueWithRange('< 70 mg/l')).toEqual({ value: 35, range: { min: 0, max: 70 } });
    expect(parseWaterValueWithRange('?')).toEqual({ value: null });
    expect(parseWaterValueWithRange('')).toEqual({ value: null });

    const om = normalizeWaterObject({
      tdsMgL: '350-400 mg/l',
      no3MgL: '0',
      fMgL: '< 0,05 mg/l',
      ph: '?',
      caMgL: '30-35',
      naPlusKMgL: '70-75',
    });
    expect(om.tdsMgL).toBe(375);
    expect(om.no3MgL).toBe(0);
    expect(om.ph).toBeNull();
    expect(om.ranges?.tdsMgL).toEqual({ min: 350, max: 400 });
    expect(om.ranges?.caMgL).toEqual({ min: 30, max: 35 });
    expect(om.ranges?.naPlusKMgL).toEqual({ min: 70, max: 75 });
    expect(om.ranges?.fMgL).toEqual({ min: 0, max: 0.05 });
    expect(om.ranges?.no3MgL).toBeUndefined();
    expect(om.ranges?.ph).toBeUndefined();
  });

  it('strips explicit inline ion charge prefixes (NO3-6,4, Ca2 + 14,0, Mg2 + 42,6) without inventing ranges or leaking negatives/NO2/SO2', () => {
    expect(parseWaterValueWithRange('NO3-6,4')).toEqual({ value: 6.4 });
    expect(parseWaterValueWithRange('NO3- 6,4 mg/l')).toEqual({ value: 6.4 });
    expect(parseWaterValueWithRange('Ca2 + 14,0')).toEqual({ value: 14 });
    expect(parseWaterValueWithRange('Ca2+14,0')).toEqual({ value: 14 });
    expect(parseWaterValueWithRange('Mg2 + 42,6 mg/l')).toEqual({ value: 42.6 });
    expect(parseWaterValueWithRange('HCO3- 130-150 mg/l')).toEqual({ value: 140, range: { min: 130, max: 150 } });

    expect(parseWaterValueWithRange('-6,4')).toEqual({ value: null });
    expect(parseWaterValueWithRange('NO2-0,23')).toEqual({ value: null });
    expect(parseWaterValueWithRange('SO2-54,1')).toEqual({ value: null });

    const davidan = normalizeWaterObject({
      dryResidueMgL: '390',
      no3MgL: 'NO3-6,4',
      caMgL: 'Ca2 + 14,0',
      mgMgL: 'Mg2 + 42,6',
      so4MgL: 'SO2-54,1',
      carbonation: 'Apă potabilă Carbogazificată',
      classification: 'Corespunde NS privind calitatea apei potabile HG Nr. 934/2',
    });
    expect(davidan.dryResidueMgL).toBe(390);
    expect(davidan.no3MgL).toBe(6.4);
    expect(davidan.caMgL).toBe(14);
    expect(davidan.mgMgL).toBe(42.6);
    expect(davidan.so4MgL).toBeNull();
    expect(davidan.carbonation).toBe('sparkling');
    expect(davidan.classification).toBe('drinking');
    expect(davidan.ranges).toBeUndefined();
  });

  it('leaves a reading unknown when its ion prefix disagrees with the profile field', () => {
    const water = normalizeWaterObject({
      caMgL: 'Mg2+42,6',
      mgMgL: 'Mg²⁺42,6',
      no3MgL: 'SO₄²⁻ 4-8 mg/l',
      so4MgL: 'SO₄²⁻ 4-8 mg/l',
      ph: 'Na+7',
      tdsMgL: 'Ca: 250',
      naPlusKMgL: 'Na+20',
      kMgL: '0',
    });

    expect(water).toMatchObject({
      caMgL: null,
      mgMgL: 42.6,
      no3MgL: null,
      so4MgL: 6,
      ph: null,
      tdsMgL: null,
      naPlusKMgL: null,
      kMgL: 0,
    });
    expect(water.ranges).toEqual({ so4MgL: { min: 4, max: 8 } });
  });

  it('infers water flag and carbonation consistently from front reads even without backend isWater', () => {
    expect(inferFrontWaterMeta({ brand: 'DAVIDAN', name: 'Apă potabilă Carbogazificată' })).toEqual({
      isWater: true,
      carbonation: 'sparkling',
    });
    expect(inferFrontWaterMeta({ brand: 'Zorel', name: 'Iaurt cu căpșuni' })).toEqual({
      isWater: false,
      carbonation: null,
    });
    expect(inferFrontWaterMeta({ brand: 'Coca-Cola', name: 'Băutură carbogazoasă' })).toEqual({
      isWater: false,
      carbonation: null,
    });
  });
});
