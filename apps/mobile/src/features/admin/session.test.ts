import { sessionFromUrl } from './session';
it('accepts native/web moderator callbacks and rejects incomplete or unrelated links', () => {
  expect(sessionFromUrl('okbite://admin#access_token=access&refresh_token=refresh')).toEqual({
    access_token: 'access',
    refresh_token: 'refresh',
  });
  expect(
    sessionFromUrl('https://okbite.md/admin#access_token=access&refresh_token=refresh'),
  ).toEqual({ access_token: 'access', refresh_token: 'refresh' });
  expect(
    sessionFromUrl('https://okbite.md/product/x#access_token=access&refresh_token=refresh'),
  ).toBeNull();
  expect(sessionFromUrl('okbite://admin#access_token=access')).toBeNull();
  expect(sessionFromUrl(null)).toBeNull();
});
it.each([
  'https://attacker.invalid/admin',
  'https://okbite.md/not/admin',
  'http://okbite.md/admin',
  'okbite://admin/product',
  'https://user:password@okbite.md/admin',
])('rejects unapproved moderator callback %s', (prefix) => {
  expect(sessionFromUrl(`${prefix}#access_token=access&refresh_token=refresh`)).toBeNull();
});
