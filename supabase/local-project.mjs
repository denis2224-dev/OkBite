// Explicit local Docker identities only; never accept an arbitrary project/container.
const localProjects = new Set([
  'okbite', 'okbite-c2', 'okbite-c3-cd37', 'okbite-c6', 'okbite-r2-review',
]);
export function localProject(config) {
  const project = config.match(/^project_id\s*=\s*"([a-z0-9-]+)"\s*$/m)?.[1];
  const run = process.env.GITHUB_RUN_ID;
  const attempt = process.env.GITHUB_RUN_ATTEMPT;
  const currentCi = process.env.GITHUB_ACTIONS === 'true' &&
    /^\d+$/.test(run ?? '') && /^\d+$/.test(attempt ?? '') &&
    project === `okbite-c3-ci-${run}-${attempt}`;
  if (!localProjects.has(project) && !currentCi) {
    throw new Error('Refusing unrecognized local project');
  }
  return project;
}

// Bind recovery credentials to this copied configuration, never another local stack.
export function localApiUrl(config, endpoint) {
  localProject(config);
  const api = config.match(/^\[api\]\s*\r?\n([\s\S]*?)(?=^\[|$(?![\s\S]))/m)?.[1];
  const port = api?.match(/^port\s*=\s*(\d+)\s*$/m)?.[1];
  let url;
  try { url = new URL(endpoint); } catch { /* fail below without exposing endpoint */ }
  if (!port || !url || url.protocol !== 'http:' ||
      !['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== port ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Photo recovery requires the configured local project API');
  }
  return url;
}

// CLI v3 removed --db-url. Its URL target syntax remains loopback-only here.
export function localRecoveryTestArgs(config, database) {
  localProject(config);
  const section = config.match(/^\[db\]\s*\r?\n([\s\S]*?)(?=^\[|$(?![\s\S]))/m)?.[1];
  const port = section?.match(/^port\s*=\s*(\d+)\s*$/m)?.[1];
  if (!port || Number(port) < 1024 || Number(port) > 65535 ||
      !/^okbite_restore_[a-f0-9]{12}$/.test(database)) {
    throw new Error('Recovery verification requires a configured disposable local database');
  }
  // CLI v3 classifies even loopback URLs as remote; consent applies only after
  // the strict local identity, port and disposable-name guards above.
  return ['test', 'db', '--yes', `--remote=postgresql://postgres:postgres@127.0.0.1:${port}/${database}?sslmode=disable`];
}
