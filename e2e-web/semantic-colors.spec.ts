import { expect, test, type Page } from '@playwright/test';
import { light, dark } from '../apps/mobile/src/theme/tokens';
import { ro } from '../apps/mobile/src/copy/ro';
const product = '/product/0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e1f';

// Check rendered colors, including every ancestor's surface, rather than just token definitions.
async function unreadableText(page: Page) {
  return page.evaluate(() => {
    const rgb = (value: string) => (value.match(/[\d.]+/g) ?? []).map(Number);
    const luminance = (channels: number[]) => channels.slice(0, 3).map(c => c / 255)
      .map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
      .reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i]!, 0);
    return [...document.querySelectorAll<HTMLElement>('div,span,p,h1,h2,input,button')].flatMap(element => {
      if (!element.getClientRects().length || ![...element.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())) return [];
      const style = getComputedStyle(element);
      let parent: HTMLElement | null = element;
      let background: number[] = [];
      while (parent) {
        background = rgb(getComputedStyle(parent).backgroundColor);
        if (background.length === 3 || background[3] === 1) break;
        parent = parent.parentElement;
      }
      if (!background.length) return [];
      const a = luminance(rgb(style.color)), b = luminance(background);
      const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700);
      return ratio + .001 < (large ? 3 : 4.5) ? [{ text: element.textContent?.slice(0, 90), foreground: style.color, background, ratio }] : [];
    });
  });
}
for (const mode of ['light', 'dark'] as const) {
  test(`${mode}: shared palette remains readable across pages and interactive states`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: mode });
    const colors = mode === 'dark' ? dark : light;
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    const scan = page.getByRole('button', { name: 'Scanează produsul', exact: true });
    await expect(scan).toBeVisible();
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', colors.ground);
    await expect(scan).toHaveCSS('background-color', colors.primary === '#D1E58A' ? 'rgb(209, 229, 138)' : 'rgb(30, 64, 51)');
    await expect(page.getByRole('tab', { name: ro.nav.home })).toHaveAttribute('aria-selected', 'true');
    await scan.focus();
    await expect(scan).toHaveCSS('outline-width', '3px');
    await scan.hover();
    await expect(scan).toHaveCSS('opacity', '1');
    expect(await unreadableText(page)).toEqual([]);
    await page.mouse.move(0, 0);
    await scan.evaluate(el => (el as HTMLElement).blur());
    await page.screenshot({ path: test.info().outputPath(`${mode}-home.png`), fullPage: true });
    for (const route of ['/history', '/compare', '/about', '/privacy', product, `${product}/ingredients`, `${product}/label`, '/scan']) {
      await page.goto(route);
      await expect(page.getByRole('button', { name: 'Înapoi', exact: true }).or(page.getByRole('tablist')).first()).toBeVisible();
      if (route === product) await expect(page.getByText('Iaurt natural 2,5%', { exact: true })).toBeVisible();
      expect(await unreadableText(page), route).toEqual([]);
    }
    const field = page.getByRole('textbox', { name: 'Introdu codul manual', exact: true });
    await field.focus();
    await expect(field).toHaveCSS('outline-width', '3px');
    await page.getByRole('button', { name: ro.scan.search, exact: true }).click();
    await expect(page.getByRole('alert')).toContainText(ro.scan.manualEmpty);
    expect(await unreadableText(page)).toEqual([]);
    expect(errors).toEqual([]);
  });
  test(`${mode}: the full score explanation stays above fixed actions at 200% text`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: mode });
    await page.goto('/');
    const explanation = page.getByText(ro.score.disclaimer, { exact: true });
    await expect(explanation).toBeAttached();
    await page.evaluate(() => {
      const text = [...document.querySelectorAll<HTMLElement>('div,span')].filter(el => [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()));
      const sizes = text.map(el => [el, getComputedStyle(el).fontSize, getComputedStyle(el).lineHeight] as const);
      for (const [el, size, height] of sizes) { el.style.fontSize = `${parseFloat(size) * 2}px`; if (height !== 'normal') el.style.lineHeight = `${parseFloat(height) * 2}px`; }
    });
    const lastNote = page.getByText(ro.home.design.footnote, { exact: true });
    await lastNote.evaluate(el => el.scrollIntoView({ block: 'end' }));
    const bottom = (await lastNote.boundingBox())!;
    const dock = (await page.getByRole('button', { name: 'Scanează produsul', exact: true }).boundingBox())!;
    expect(bottom.y + bottom.height).toBeLessThanOrEqual(dock.y);
    expect(await unreadableText(page)).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`${mode}-200-percent.png`), fullPage: true });
  });
}
