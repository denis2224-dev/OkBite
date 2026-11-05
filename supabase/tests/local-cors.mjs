// Supabase CLI 2.65.5's local Kong cors plugin replaces Edge Function CORS.
// Let the handler answer preflights and response headers on this worktree's dedicated local stack only.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const config = readFileSync(new URL('../config.toml', import.meta.url), 'utf8');
const project = config.match(/^project_id = "(okbite-c(?:3-[a-z0-9-]+|6))"$/m)?.[1];
if (!project) throw new Error('Refusing to modify a unrecognized local gateway');
const container = `supabase_kong_${project}`;
const command = (...args) => execFileSync('docker', args, { encoding: 'utf8' });
const original = command('exec', container, 'cat', '/home/kong/kong.yml');
const start = original.indexOf('  - name: functions-v1\n');
const end = original.indexOf('\n  - name:', start + 1);
if (start < 0 || end < 0) throw new Error('Unexpected local gateway configuration');
const service = original.slice(start, end);
const updated = service.replace('\n      - name: cors\n', '\n');
if (updated !== service) {
  const patched = original.slice(0, start) + updated + original.slice(end);
  execFileSync('docker', ['exec', '-i', container, 'sh', '-c', 'cat > /home/kong/kong.yml'], {
    input: patched,
  });
  command('exec', container, 'kong', 'reload');
}
console.log(`Handler CORS enabled on ${container}; other services unchanged.`);
