import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
const { loadConfig } = createRequire(import.meta.url)('metro-config');
const mobile = fileURLToPath(new URL('../apps/mobile', import.meta.url));
test('mobile Metro resolves routes from the target workspace rather than the root preview', async () => {
  const config = await loadConfig({ cwd: mobile });
  assert.equal(config.projectRoot, mobile);
});
