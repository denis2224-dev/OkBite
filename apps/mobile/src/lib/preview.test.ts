const original = { ...process.env };
afterEach(() => { process.env = { ...original }; });
beforeEach(() => {
  jest.resetModules();
  delete process.env.EXPO_PUBLIC_PREVIEW;
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
});

it('requires explicit demo opt-in even when backend configuration is missing', () => {
  expect(jest.requireActual('./preview').isPreview).toBe(false);
});
it('honors an explicit demo flag', () => {
  process.env.EXPO_PUBLIC_PREVIEW = '1';
  expect(jest.requireActual('./preview').isPreview).toBe(true);
});
it('does not override an explicit real-mode flag without a backend', () => {
  process.env.EXPO_PUBLIC_PREVIEW = '0';
  expect(jest.requireActual('./preview').isPreview).toBe(false);
});
