import { readFileSync } from 'node:fs';

const { packageManager } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const expected = packageManager.replace('@', '/');
const actual = (process.env.npm_config_user_agent ?? '').split(' ')[0];

if (Number(process.versions.node.split('.')[0]) < 22 || actual !== expected) {
  console.error(`Use the declared package manager ${packageManager} with Node 22+: corepack pnpm install --frozen-lockfile`);
  process.exitCode = 1;
}
