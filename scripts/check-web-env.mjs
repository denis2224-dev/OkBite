// Fails a Cloudflare Pages build (CF_PAGES=1) that would ship a web bundle pointing at the wrong backend.
// Mirrors the production rules in apps/mobile/app.config.ts. Local and CI builds are not checked.
import { pathToFileURL } from 'node:url';

export function webEnvProblems(env) {
  if (env.CF_PAGES !== '1') return [];
  const url = env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  return [
    !/^https:\/\/[^/]+$/.test(url) && 'EXPO_PUBLIC_SUPABASE_URL must be an https origin',
    /localhost|127\.0\.0\.1/.test(url) && 'EXPO_PUBLIC_SUPABASE_URL points at a local backend',
    !env.EXPO_PUBLIC_SUPABASE_ANON_KEY && 'EXPO_PUBLIC_SUPABASE_ANON_KEY is missing',
    env.CF_PAGES_BRANCH === 'main' && env.EXPO_PUBLIC_PREVIEW === '1' && 'EXPO_PUBLIC_PREVIEW=1 would ship demo data to production',
  ].filter(Boolean);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = webEnvProblems(process.env);
  if (problems.length) {
    console.error(`Invalid web build env: ${problems.join('; ')}`);
    process.exit(1);
  }
}
