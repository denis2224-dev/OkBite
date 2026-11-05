// Live-service tests are opt-in; ordinary Deno runs still exercise all unit tests.
export function integrationTest(name: string, fn: () => void | Promise<void>): void {
  Deno.test({
    name,
    ignore: Deno.env.get('OKBITE_RUN_INTEGRATION') !== '1',
    fn: () => {
      for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY']) {
        if (!Deno.env.get(key)) throw new Error(`Integration tests require ${key}`);
      }
      return fn();
    },
  });
}
