import { unknownDraftStorage } from './unknownDraftStorage';

const mockFiles = new Map<string, string>();
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///documents/',
  getInfoAsync: async (path: string) => ({ exists: mockFiles.has(path) }),
  readAsStringAsync: async (path: string) => mockFiles.get(path),
  writeAsStringAsync: async (path: string, value: string) => { mockFiles.set(path, value); },
  deleteAsync: async (path: string) => { mockFiles.delete(path); },
}));

it('keeps native JSON across adapter reload and removes only its own file', async () => {
  mockFiles.set('file:///documents/unrelated.json', 'keep');
  expect(await unknownDraftStorage.read()).toBeNull();
  await unknownDraftStorage.write('{"id":"draft-a"}');
  jest.resetModules();
  const reloaded = jest.requireActual<typeof import('./unknownDraftStorage')>('./unknownDraftStorage').unknownDraftStorage;
  expect(await reloaded.read()).toBe('{"id":"draft-a"}');
  await reloaded.remove();
  expect(await reloaded.read()).toBeNull();
  expect(mockFiles.get('file:///documents/unrelated.json')).toBe('keep');
});
