import { DatabaseSync as mockDatabaseSync } from 'node:sqlite';
import { randomUUID as mockRandomUUID } from 'node:crypto';
import * as mockFs from 'node:fs/promises';
import { mkdtempSync as mockMkdtempSync } from 'node:fs';
import { tmpdir as mockTmpdir } from 'node:os';
import { join as mockJoin } from 'node:path';
import { act, renderHook } from '@testing-library/react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator } from 'expo-image-manipulator';
import { api, ApiError } from '../../lib/api';
import { flushQueue } from '../offline/queue';
import { listQueued } from '../history/db';
import { getFromHistory } from '../history/store';
import { useCaptureFlow } from './useCaptureFlow';
import { identifyFound, PRODUCT_ID } from './__fixtures__/responses';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useFocusEffect: (callback: () => void | (() => void)) => jest.requireActual<typeof import('react')>('react').useEffect(callback, [callback]), useRouter: () => ({ replace: mockReplace }) }));
jest.mock('expo-camera', () => ({ scanFromURLAsync: jest.fn(async () => []) }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-image-manipulator', () => ({ SaveFormat: { JPEG: 'jpeg' }, ImageManipulator: { manipulate: jest.fn() } }));
jest.mock('expo-crypto', () => ({ randomUUID: mockRandomUUID }));
jest.mock('expo-sqlite', () => {
  const sqlite = new mockDatabaseSync(':memory:');
  const db = {
    execAsync: async (sql: string) => sqlite.exec(sql),
    runAsync: async (sql: string, ...values: (string | number)[]) => sqlite.prepare(sql).run(...values),
    getAllAsync: async (sql: string) => sqlite.prepare(sql).all(),
    withExclusiveTransactionAsync: async (fn: (connection: unknown) => Promise<void>) => {
      sqlite.exec('BEGIN');
      try { await fn(db); sqlite.exec('COMMIT'); } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  return { openDatabaseAsync: async () => db };
});
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: mockMkdtempSync(mockJoin(mockTmpdir(), 'okbite-capture-offline-')) + '/',
  EncodingType: { Base64: 'base64' },
  makeDirectoryAsync: async (path: string) => mockFs.mkdir(path, { recursive: true }),
  copyAsync: async ({ from, to }: { from: string; to: string }) => mockFs.copyFile(from, to),
  readAsStringAsync: async (path: string) => (await mockFs.readFile(path)).toString('base64'),
  getInfoAsync: async (path: string) => ({ exists: await mockFs.stat(path).then(() => true, () => false) }),
  deleteAsync: async (path: string) => mockFs.rm(path, { force: true }),
}));
jest.mock('../../lib/api', () => ({ ...jest.requireActual('../../lib/api'), api: { lookup: jest.fn(), identify: jest.fn() } }));
afterAll(async () => { await mockFs.rm(FileSystem.documentDirectory!, { recursive: true, force: true }); });
it('recovers the captured JPEG after temporary photos disappear and stores the resolved product in history', async () => {
  const original = FileSystem.documentDirectory! + 'camera.jpg';
  const compressed = FileSystem.documentDirectory! + 'compressed.jpg';
  await mockFs.writeFile(original, 'uncompressed original');
  await mockFs.writeFile(compressed, 'jpeg');
  jest.mocked(ImageManipulator.manipulate).mockReturnValue({
    renderAsync: async () => ({ width: 1600, height: 1200,
      saveAsync: async () => ({ uri: compressed, base64: Buffer.from('jpeg').toString('base64') }),
    }),
  } as unknown as ReturnType<typeof ImageManipulator.manipulate>);
  jest.mocked(api.identify).mockRejectedValueOnce(new ApiError('offline')).mockResolvedValueOnce(identifyFound);
  const hook = await renderHook(() => useCaptureFlow());
  await act(async () => { await hook.result.current.takePhoto({ takePictureAsync: async () => ({ uri: original }) }); });
  expect(mockReplace).toHaveBeenCalledWith('/offline');
  const kept = (await listQueued())[0]!;
  await mockFs.unlink(original);
  await mockFs.unlink(compressed);
  expect(await mockFs.readFile(kept.payload, 'utf8')).toBe('jpeg');
  expect(await flushQueue()).toEqual({ resolved: 1 });
  expect(api.identify).toHaveBeenNthCalledWith(2, 'anBlZw==');
  expect((await getFromHistory(PRODUCT_ID))?.product.id).toBe(PRODUCT_ID);
  expect(await listQueued()).toEqual([]);
  await expect(mockFs.stat(kept.payload)).rejects.toThrow();
  await hook.unmount();
});
