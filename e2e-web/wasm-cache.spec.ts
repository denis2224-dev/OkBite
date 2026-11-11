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
