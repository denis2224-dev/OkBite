const names = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] as const;

// Discovery may skip an unconfigured local suite, but never a broken configuration.
// No clients or network work belongs here: setup runs only inside the test body.
export function integrationConfigured(read = (name: string) => Deno.env.get(name)): boolean {
  const values = names.map(read);
  if (values.every((value) => value === undefined)) return false;
  const invalid = () =>
    new Error(
      'Invalid local integration configuration: supply a loopback HTTP SUPABASE_URL, ' +
        'SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY together.',
    );
  if (values.some((value) => !value || value.trim() !== value)) throw invalid();
  let url: URL;
  try {
    url = new URL(values[0]!);
  } catch {
    throw invalid();
  }
  if (
    url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    url.username || url.password || url.pathname !== '/' || url.search || url.hash
  ) throw invalid();
  const jwt = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  if (
    !jwt.test(values[1]!) && !/^sb_publishable_[A-Za-z0-9_-]+$/.test(values[1]!) ||
    !jwt.test(values[2]!) && !/^sb_secret_[A-Za-z0-9_-]+$/.test(values[2]!)
  ) throw invalid();
  return true;
}

export function integrationTest(name: string, fn: () => void | Promise<void>): void {
  Deno.test({ name, ignore: !integrationConfigured(), fn });
}
