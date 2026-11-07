const prod = {
  EAS_BUILD_PROFILE: 'production',
  EXPO_PUBLIC_SUPABASE_URL: 'https://prod.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'public-anon',
  EXPO_PUBLIC_EAS_PROJECT_ID: '00000000-0000-4000-8000-000000000000',
  EXPO_PUBLIC_PREVIEW: undefined as string | undefined,
};
const load = (env: Record<string, string | undefined>) => {
  const saved = { ...process.env };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    let config: unknown;
    jest.isolateModules(() => { config = jest.requireActual<{ default: unknown }>('./app.config').default; });
    return config;
  } finally {
    process.env = saved;
  }
};
it('builds a complete production config', () => {
  expect(load(prod)).toMatchObject({ extra: { supabaseUrl: 'https://prod.supabase.co' } });
});
it.each([
  ['EXPO_PUBLIC_SUPABASE_URL', undefined],
  ['EXPO_PUBLIC_SUPABASE_ANON_KEY', ''],
  ['EXPO_PUBLIC_EAS_PROJECT_ID', undefined],
  ['EXPO_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321'],
  ['EXPO_PUBLIC_PREVIEW', '1'],
])('refuses a production build with %s=%s', (key, value) => {
  expect(() => load({ ...prod, [key]: value })).toThrow(/production/i);
});
it('leaves development and preview builds unchanged', () => {
  expect(() => load({ ...prod, EAS_BUILD_PROFILE: 'preview', EXPO_PUBLIC_SUPABASE_URL: undefined })).not.toThrow();
});
