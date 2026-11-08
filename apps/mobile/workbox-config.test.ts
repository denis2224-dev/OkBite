const config = jest.requireActual<{ runtimeCaching: { urlPattern: RegExp | ((context: { url: URL; sameOrigin: boolean }) => boolean); handler: string; options: Record<string, unknown> }[] }>('./workbox-config.cjs');
it('serves cached lookups only when the network fails, never because it is slow', () => {
  const lookup = config.runtimeCaching.find((rule) =>
    rule.urlPattern instanceof RegExp && rule.urlPattern.test('https://x.supabase.co/functions/v1/lookup?code=4840001000014'));
  expect(lookup?.handler).toBe('NetworkFirst');
  // A timeout fallback answered "found" from cache while the live API said "not_found" (audit X-02).
  expect(lookup?.options.networkTimeoutSeconds).toBeUndefined();
});

it('keeps the lazy ZXing chunk out of the generated precache', async () => {
  const fs = jest.requireActual<typeof import('node:fs')>('node:fs');
  const path = jest.requireActual<typeof import('node:path')>('node:path');
  const temp = jest.requireActual<typeof import('node:os')>('node:os').tmpdir();
  const dir = fs.mkdtempSync(path.join(temp, 'okbite-precache-'));
  try {
    const output = path.join(dir, '_expo/static/js/web'); fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), '<html></html>');
    fs.writeFileSync(path.join(output, 'entry-ab12.js'), 'app();');
    fs.writeFileSync(path.join(output, 'zxingReader-ab12.js'), 'decoder();');
    // Execute the real Node build tool outside Jest's browser export conditions.
    const { execFileSync } = jest.requireActual<typeof import('node:child_process')>('node:child_process');
    const manifest = execFileSync(process.execPath, ['-e', `
      const { getManifest } = require('workbox-build');
      const { globPatterns, globIgnores } = require('./workbox-config.cjs');
      getManifest({ globDirectory: process.argv[1], globPatterns, globIgnores })
        .then(result => process.stdout.write(JSON.stringify(result.manifestEntries.map(entry => entry.url).sort())))
        .catch(error => { console.error(error); process.exitCode = 1; });
    `, dir], { cwd: __dirname, encoding: 'utf8' });
    expect(JSON.parse(manifest)).toEqual(['_expo/static/js/web/entry-ab12.js', 'index.html']);
  } finally {
    if (!path.resolve(dir).startsWith(path.resolve(temp) + path.sep)) throw new Error('Unexpected fixture path');
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

it('caches only same-origin decoder chunks on demand for offline reuse', () => {
  const rule = config.runtimeCaching.find(rule => typeof rule.urlPattern === 'function');
  expect(rule?.handler).toBe('CacheFirst');
  expect(rule?.options.cacheableResponse).toEqual({ statuses: [200] });
  if (!rule || typeof rule.urlPattern !== 'function') throw new Error('Missing decoder route');
  for (const [pathname, sameOrigin, expected] of [
    ['/_expo/static/js/web/zxingReader-ab12.js', true, true],
    ['/_expo/static/js/web/zxingReader-ab12.js', false, false],
    ['/_expo/static/js/web/entry-ab12.js', true, false],
    ['/_expo/static/js/web/zxingReader-ab12.js.map', true, false],
  ] as const) {
    expect(rule.urlPattern({ url: new URL(pathname, 'https://okbite.pages.dev'), sameOrigin })).toBe(expected);
  }
});
