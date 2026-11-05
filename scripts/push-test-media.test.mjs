import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, chmodSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const files = ['known-front.jpg', 'known-barcode.jpg', 'unknown-front.jpg', 'unknown-ingredients.jpg', 'unknown-nutrition.jpg'];
test('media preflight checks every file before invoking a device and preserves paths with spaces', () => {
  const dir = mkdtempSync(join(tmpdir(), 'okbite media '));
  try {
    const log = join(dir, 'calls');
    const command = join(dir, 'xcrun');
    writeFileSync(command, '#!/bin/sh\nfor arg do printf "%s\\n" "$arg" >> "$OKBITE_MEDIA_LOG"; done\n');
    chmodSync(command, 0o755);
    const run = () => spawnSync('bash', ['scripts/push-test-media.sh', 'ios', dir], {
      encoding: 'utf8', env: { ...process.env, PATH: dir + ':' + process.env.PATH, OKBITE_MEDIA_LOG: log },
    });
    files.slice(0, -1).forEach(file => writeFileSync(join(dir, file), 'test-only sentinel'));
    const missing = run();
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /unknown-nutrition.jpg/);
    assert.throws(() => readFileSync(log));
    writeFileSync(join(dir, files.at(-1)), 'test-only sentinel');
    assert.equal(run().status, 0);
    assert.deepEqual(readFileSync(log, 'utf8').trim().split('\n'), ['simctl', 'addmedia', 'booted', ...files.map(file => join(dir, file))]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
