import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Buffer } from 'node:buffer';

const require = createRequire(__filename);
const { getManifest } = require('workbox-build');
const config = require('../apps/mobile/workbox-config.cjs');

test('exported local barcode WASM enters the offline precache', async () => {
  const output = await mkdtemp(join(tmpdir(), 'okbite-wasm-'));
  try {
    await mkdir(join(output, '_expo/static/wasm'), { recursive: true });
    // Asset selection is independent of N6's final filename and decoder implementation.
    await writeFile(join(output, '_expo/static/wasm/barcode-reader.wasm'), Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]));
    await writeFile(join(output, 'index.html'), '<html></html>');
    const result = await getManifest({ globDirectory: output, globPatterns: config.globPatterns, globIgnores: config.globIgnores });
    expect(result.warnings).toEqual([]);
    expect(result.manifestEntries.map((entry: { url: string }) => entry.url)).toContain('_expo/static/wasm/barcode-reader.wasm');
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('the exported decoder is available and compiles through the service worker offline', async ({ page, context }) => {
  await page.goto('/about');
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await context.setOffline(true);
  const decoder = await page.evaluate(async () => {
    const response = await fetch('/zxing_reader.wasm');
    const module = await WebAssembly.compile(await response.arrayBuffer());
    return { ok: response.ok, mime: response.headers.get('content-type'), exports: WebAssembly.Module.exports(module).length };
  });
  expect(decoder.ok).toBe(true);
  expect(decoder.mime).toBe('application/wasm');
  expect(decoder.exports).toBeGreaterThan(0);
});

test('the offline web scanner decodes a camera frame using the shipped WASM', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Uses a synthetic Chromium canvas camera; both browsers check the offline asset above.');
  await page.goto('/about');
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await context.setOffline(true);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'BarcodeDetector', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: async () => {
        const digits = '0036000291452';
        const left = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
        const right = left.map(bits => bits.replace(/[01]/g, bit => bit === '1' ? '0' : '1'));
        const bits = '101' + [...digits.slice(1, 7)].map(digit => left[Number(digit)]).join('')
          + '01010' + [...digits.slice(7)].map(digit => right[Number(digit)]).join('') + '101';
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const drawing = canvas.getContext('2d')!;
        const stream = canvas.captureStream(12);
        const [track] = stream.getVideoTracks();
        if (!track) throw new Error('Synthetic camera did not create a video track.');
        const draw = () => {
          if (track.readyState !== 'live') return;
          drawing.fillStyle = '#fff';
          drawing.fillRect(0, 0, 640, 480);
          drawing.fillStyle = '#000';
          [...bits].forEach((bit, i) => { if (bit === '1') drawing.fillRect(130 + i * 4, 115, 4, 250); });
          requestAnimationFrame(draw);
        };
        draw();
        return stream;
      },
    } });
  });
  const wasm = page.waitForResponse(response => response.url().endsWith('/zxing_reader.wasm') && response.fromServiceWorker());
  await page.goto('/scan');
  expect((await wasm).ok()).toBe(true);
  await expect(page.getByText('Fără conexiune', { exact: true })).toBeVisible();
  await page.goto('/offline');
  await expect(page.getByText('0036000291452', { exact: true })).toBeVisible();
});
