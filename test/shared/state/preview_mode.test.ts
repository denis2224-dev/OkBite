const names = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_PREVIEW'] as const;
const before = names.map((name) => process.env[name]);
afterEach(() => {
  names.forEach((name, index) => {
    if (before[index] === undefined) delete process.env[name];
    else process.env[name] = before[index];
  });
});
it.each([undefined, '0', '1'])(
  'keeps the root preview isolated from configured services (flag %s)',
  (flag) => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    if (flag === undefined) delete process.env.EXPO_PUBLIC_PREVIEW;
    else process.env.EXPO_PUBLIC_PREVIEW = flag;
    jest.isolateModules(() => {
      const { isPreview } = jest.requireActual<
        typeof import('../../../src/shared/state/app_state')
      >('../../../src/shared/state/app_state');
      expect(isPreview).toBe(true);
    });
  },
);
