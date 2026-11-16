import { describe, expect, it } from 'vitest';
import {
  detectWaterFrontHint,
  normalizeWaterObject,
  parseWaterCarbonation,
  parseWaterClassification,
  parseWaterValue,
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
});
