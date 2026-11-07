const config = require('./workbox-config.cjs');
it('serves cached lookups only when the network fails, never because it is slow', () => {
  const lookup = config.runtimeCaching.find((rule: { urlPattern: RegExp }) =>
    rule.urlPattern.test('https://x.supabase.co/functions/v1/lookup?code=4840001000014'));
  expect(lookup.handler).toBe('NetworkFirst');
  // A timeout fallback answered "found" from cache while the live API said "not_found" (audit X-02).
  expect(lookup.options.networkTimeoutSeconds).toBeUndefined();
});
