import { DatabaseSync as mockDatabaseSync } from 'node:sqlite';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { readProfile, writeProfile, deleteProfile } from './db';

jest.mock('expo-sqlite', () => {
  const sqlite = new mockDatabaseSync(':memory:');
  return {
    openDatabaseAsync: async () => ({
      execAsync: async (sql: string) => sqlite.exec(sql),
      runAsync: async (sql: string, ...values: string[]) => sqlite.prepare(sql).run(...values),
      getFirstAsync: async (sql: string, ...values: string[]) => sqlite.prepare(sql).get(...values),
    }),
  };
});

describe('profile db (native SQLite)', () => {
  beforeEach(async () => {
    await deleteProfile();
  });

  it('reads null when no profile row exists', async () => {
    expect(await readProfile()).toBeNull();
  });

  it('writes and reads profile JSON', async () => {
    await writeProfile('{"goals":["health"]}');
    expect(await readProfile()).toBe('{"goals":["health"]}');
  });

  it('updates existing profile JSON on conflict', async () => {
    await writeProfile('{"goals":["health"]}');
    await writeProfile('{"goals":["family"]}');
    expect(await readProfile()).toBe('{"goals":["family"]}');
  });

  it('deletes profile row', async () => {
    await writeProfile('{"goals":["health"]}');
    await deleteProfile();
    expect(await readProfile()).toBeNull();
  });
});

