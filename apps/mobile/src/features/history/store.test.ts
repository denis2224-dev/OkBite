import { DatabaseSync as mockDatabaseSync } from 'node:sqlite';
import { saveToHistory, listHistory, getFromHistory, clearHistory, removeFromHistory, restoreToHistory } from './store';
import { writeHistory } from './db';
import { foundYogurt } from '../../test/fixtures';

jest.mock('expo-sqlite', () => {
  const sqlite = new mockDatabaseSync(':memory:');
  const connection = {
    execAsync: async (sql: string) => sqlite.exec(sql),
    runAsync: async (sql: string, ...values: (string | number)[]) => sqlite.prepare(sql).run(...values),
    getAllAsync: async (sql: string) => sqlite.prepare(sql).all(),
    withExclusiveTransactionAsync: async (action: (db: unknown) => Promise<void>) => {
      sqlite.exec('BEGIN IMMEDIATE');
      try { await action(connection); sqlite.exec('COMMIT'); }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  return { openDatabaseAsync: async () => connection };
});
beforeEach(async () => { await clearHistory(); });
it('saves and updates one row per product, newest first', async () => {
  const second = { ...foundYogurt, product: { ...foundYogurt.product, id: '00000000-0000-4000-8000-000000000002' } };
  await saveToHistory(foundYogurt);
  await saveToHistory(second);
  await saveToHistory({ ...foundYogurt, product: { ...foundYogurt.product, name: 'Actualizat' } });
  const rows = await listHistory();
  expect(rows.map(row => row.product.id)).toEqual([foundYogurt.product.id, second.product.id]);
  expect((await getFromHistory(foundYogurt.product.id))?.product.name).toBe('Actualizat');
});
it('bounds stored history to the latest 200 products', async () => {
  for (let i = 1; i <= 201; i++) {
    await saveToHistory({ ...foundYogurt, product: { ...foundYogurt.product, id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}` } });
  }
  expect(await listHistory()).toHaveLength(200);
  expect(await getFromHistory('00000000-0000-4000-8000-000000000001')).toBeUndefined();
});
it('skips corrupt saved JSON without hiding other valid products', async () => {
  await saveToHistory(foundYogurt);
  await writeHistory('corrupt', '{', '2026-11-05T00:00:00.000Z');
  expect(await listHistory()).toHaveLength(1);
});
it('clears history and rejects records that break the shared contract', async () => {
  await expect(saveToHistory({ ...foundYogurt, product: { ...foundYogurt.product, id: 'invalid' } })).rejects.toThrow();
  await saveToHistory(foundYogurt);
  await clearHistory();
  expect(await listHistory()).toEqual([]);
});

it('deletes one item and restores its original date without affecting other rows', async () => {
  const other = { ...foundYogurt, product: { ...foundYogurt.product, id: '00000000-0000-4000-8000-000000000002' } };
  await saveToHistory(foundYogurt);
  const original = (await listHistory())[0]!;
  await saveToHistory(other);
  await removeFromHistory(original.product.id);
  expect((await listHistory()).map(row => row.product.id)).toEqual([other.product.id]);
  await restoreToHistory(original);
  expect(await getFromHistory(original.product.id)).toEqual(original);
});
it('undo never replaces a product scanned again after deletion', async () => {
  await saveToHistory(foundYogurt);
  const original = (await listHistory())[0]!;
  await removeFromHistory(original.product.id);
  await saveToHistory({ ...foundYogurt, product: { ...foundYogurt.product, name: 'Actualizat după ștergere' } });
  await restoreToHistory(original);
  expect((await getFromHistory(original.product.id))?.product.name).toBe('Actualizat după ștergere');
});
