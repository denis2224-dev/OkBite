import { expect, test } from '@playwright/test';

const pages = ['/', '/about', '/product/0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e1f'];

test('serves the Cloudflare security and cache headers', async ({ request }) => {
  const home = (await request.get('/')).headers();
  expect(home['strict-transport-security']).toBe('max-age=31536000');
  expect(home['x-content-type-options']).toBe('nosniff');
  expect(home['x-frame-options']).toBe('DENY');
  expect(home['permissions-policy']).toContain('camera=(self)');
  expect(home['content-security-policy-report-only']).toContain("frame-ancestors 'none'");
  expect((await request.get('/sw.js')).headers()['cache-control']).toBe('no-cache');
  expect((await request.get('/manifest.webmanifest')).headers()['content-type']).toBe('application/manifest+json');
});

for (const path of pages) {
  test(`${path} loads without a CSP violation`, async ({ page }) => {
    // Report-only violations still fire securitypolicyviolation; console warnings about report-to are not violations.
    const violations: string[] = [];
    page.on('console', message => { if (message.text().startsWith('CSP violation:')) violations.push(message.text()); });
    await page.addInitScript(() => document.addEventListener('securitypolicyviolation', event => console.error(`CSP violation: ${event.violatedDirective} ${event.blockedURI}`)));
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(violations).toEqual([]);
  });
}
