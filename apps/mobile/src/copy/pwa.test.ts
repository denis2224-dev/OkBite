import { ro } from './ro';

test.each([
  'install.title', 'install.description', 'install.iosHint', 'install.failed',
  'update.title', 'update.apply', 'camera.iosDenied', 'camera.androidDenied',
  'camera.httpsRequired', 'camera.unavailable', 'camera.busy',
  'scannerUnavailable', 'storageWarning', 'analysis.title', 'analysis.unknown', 'analysis.retry',
])('supplies Romanian PWA copy for %s', key => {
  expect(ro).toHaveProperty(`pwa.${key}`, expect.any(String));
});

test('preserves the team-approved install and update wording', () => {
  expect(ro).toHaveProperty('pwa.install.title', 'Instalează OkBite');
  expect(ro).toHaveProperty('pwa.install.iosHint', 'Apăsă Partajează, apoi Adaugă pe ecranul principal.');
  expect(ro).toHaveProperty('pwa.update.title', 'Versiune nouă disponibilă');
  expect(ro).toHaveProperty('pwa.update.apply', 'Actualizează');
});

test('uses comma-below Romanian diacritics in browser guidance', () => {
  const copy: unknown = Reflect.get(ro, 'pwa');
  expect(copy).toBeDefined();
  expect(JSON.stringify(copy)).not.toMatch(/[şţŞŢ]/);
});
