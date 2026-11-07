const load = (env: Record<string, string | undefined>) => {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  for (const [key, value] of Object.entries(env)) if (value === undefined) delete process.env[key];
  let value = false;
  jest.isolateModules(() => { value = jest.requireActual<{ isPreview: boolean }>('./preview').isPreview; });
  process.env = saved;
  return value;
};
it('shows demo data only when the build opts in explicitly', () => {
  expect(load({ EXPO_PUBLIC_PREVIEW: '1', EXPO_PUBLIC_SUPABASE_URL: undefined })).toBe(true);
  expect(load({ EXPO_PUBLIC_PREVIEW: undefined, EXPO_PUBLIC_SUPABASE_URL: undefined })).toBe(false);
  expect(load({ EXPO_PUBLIC_PREVIEW: '0', EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' })).toBe(false);
});
