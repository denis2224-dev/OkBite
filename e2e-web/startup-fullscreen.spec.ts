import { test, expect } from '@playwright/test';
import { ro } from '../apps/mobile/src/copy/ro';
const sizes = [
  {name:'small-phone', width:360, height:640},
  {name:'phone-landscape', width:844, height:390},
  {name:'tablet', width:1024, height:1366},
  {name:'desktop', width:1440, height:900},
  {name:'ultrawide', width:2560, height:1080},
];
for (const mode of ['light'] as const) for (const size of sizes) {
  test(`${mode} ${size.name}: startup covers the viewport with uncropped artwork`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.emulateMedia({colorScheme:mode});
    // Hold only the startup timer; React, image loading and fonts keep running normally.
    await page.addInitScript(() => {
      const timeout = window.setTimeout.bind(window);
      Object.defineProperty(window, 'setTimeout', {value: (callback: TimerHandler, delay?: number, ...args: unknown[]) => {
        if (delay !== 500 || typeof callback !== 'function') return timeout(callback, delay, ...args);
        const id = timeout(() => {}, 60000);
        Object.assign(window, {__okbiteReleaseStartup: () => { clearTimeout(id); callback(...args); }});
        return id;
      }});
    });
    await page.goto('/', {waitUntil:'domcontentloaded'});
    const screen = page.getByRole('progressbar', {name:ro.app.loading});
    await expect(screen).toBeVisible();
    for (const layer of [screen, page.getByTestId('startup-background'), page.getByTestId('startup-artwork')]) {
      await expect(layer).toBeVisible();
      const bounds = (await layer.boundingBox())!;
      expect(bounds.x).toBeCloseTo(0, 0);
      expect(bounds.y).toBeCloseTo(0, 0);
      expect(bounds.width).toBeCloseTo(size.width, 0);
      expect(bounds.height).toBeCloseTo(size.height, 0);
    }
    await expect(screen).toHaveCSS('background-color', 'rgb(247, 244, 236)');
    await page.screenshot({path:test.info().outputPath(`${mode}-${size.name}.png`)});
    await page.evaluate(() => (window as unknown as {__okbiteReleaseStartup: () => void}).__okbiteReleaseStartup());
    await expect(page.getByRole('progressbar', {name:ro.app.loading})).toHaveCount(0);
    await expect(page.getByRole('tablist')).toBeVisible();
  });
}
