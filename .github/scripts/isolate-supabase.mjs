import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';

const run = process.env.GITHUB_RUN_ID;
const attempt = process.env.GITHUB_RUN_ATTEMPT;
if (!/^\d+$/.test(run ?? '') || !/^\d+$/.test(attempt ?? '')) {
  throw new Error('Missing numeric GitHub run identity');
}
const file = 'supabase/config.toml';
const original = await readFile(file, 'utf8');
if ((original.match(/^port\s*=\s*\d+$/gm) ?? []).length !== 4 ||
    (original.match(/^shadow_port\s*=\s*\d+$/gm) ?? []).length !== 1 ||
    !/^project_id\s*=\s*"[^"]+"$/m.test(original)) {
  throw new Error('Unexpected local Supabase configuration');
}
const servers = [];
try {
  // Keep all five reservations open together so they cannot repeat within a run.
  for (let i = 0; i < 5; i++) {
    const server = createServer();
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    servers.push(server);
  }
  const ports = servers.map(server => server.address().port);
  let index = 0;
  const updated = original
    .replace(/^project_id\s*=\s*"[^"]+"$/m, `project_id = "okbite-c3-ci-${run}-${attempt}"`)
    .replace(/^port\s*=\s*\d+$/gm, () => `port = ${ports[index++]}`)
    .replace(/^shadow_port\s*=\s*\d+$/m, `shadow_port = ${ports[4]}`);
  await writeFile(file, updated);
  console.log(`Isolated Supabase project okbite-c3-ci-${run}-${attempt}`);
} finally {
  await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
}
