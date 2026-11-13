import { ro } from './ro';

test.each([
  'install.title', 'install.action', 'install.iosHint', 'install.failed',
  'update.title', 'update.apply', 'camera.iosDenied', 'camera.androidDenied',
  'camera.httpsRequired', 'camera.unavailable', 'camera.busy',
  'scannerUnavailable', 'analysis.title', 'analysis.unknown',
])('supplies Romanian PWA copy for %s', key => {
  expect(ro).toHaveProperty(`pwa.${key}`, expect.any(String));
});

test('preserves the team-approved install and update wording', () => {
  expect(ro).toHaveProperty('pwa.install.title', 'Instalează OkBite');
  expect(ro).toHaveProperty('pwa.install.action', 'Instalează');
  expect(ro).not.toHaveProperty('pwa.install.description');
  expect(ro).toHaveProperty('pwa.install.iosHint', 'Apasă Partajează, apoi Adaugă pe ecranul principal.');
  expect(ro).toHaveProperty('pwa.update.title', 'Versiune nouă disponibilă');
  expect(ro).toHaveProperty('pwa.update.apply', 'Actualizează');
});

test('uses comma-below Romanian diacritics in browser guidance', () => {
  const copy: unknown = Reflect.get(ro, 'pwa');
  expect(copy).toBeDefined();
  expect(JSON.stringify(copy)).not.toMatch(/[şţŞŢ]/);
});

test('has no leftover always-visible storage warning key', () => {
  expect(ro.pwa).not.toHaveProperty('storageWarning');
});
test('keeps Scan home copy short and names the label path once', () => {
  expect(ro.scan).toEqual(expect.objectContaining({
    deniedText: 'Permite accesul la cameră ca să scanezi.', manual: 'Introdu codul',
    manualPlaceholder: '8 sau 13 cifre', manualInvalid: 'Codul are 8 sau 13 cifre.', photoLabel: 'Fotografiază eticheta',
  }));
  expect(ro.scan).not.toHaveProperty('manualHint');
  expect(ro.scan.webManualOnly).toContain('fotografiază eticheta');
});
