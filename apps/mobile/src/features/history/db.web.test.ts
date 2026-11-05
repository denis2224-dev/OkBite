import 'fake-indexeddb/auto';
import { serialize, deserialize } from 'node:v8';
import { writeHistory, readHistory, deleteHistory, putQueued, listQueued, deleteQueued, setQueuedReview } from './db.web';

beforeAll(() => {
  if (!global.structuredClone) {
    global.structuredClone = value => deserialize(serialize(value));
  }
});
beforeEach(async () => { await deleteHistory(); });
it('preserves concurrent saves, updates duplicates and keeps recent entries first', async () => {
  await Promise.all([writeHistory('a', '{"name":"a"}', '2026-11-05T00:00:01.000Z'), writeHistory('b', '{"name":"b"}', '2026-11-05T00:00:02.000Z')]);
  await writeHistory('a', '{"name":"updated"}', '2026-11-05T00:00:03.000Z');
  expect(await readHistory()).toEqual([{ json: '{"name":"updated"}' }, { json: '{"name":"b"}' }]);
});
it('bounds the browser database and clears it', async () => {
  for (let i = 0; i < 201; i++) await writeHistory(String(i), String(i), '2026-11-05T00:00:00.000Z');
  expect(await readHistory()).toHaveLength(200);
  await deleteHistory();
  expect(await readHistory()).toEqual([]);
});
it('retains FIFO order for queue items saved in the same millisecond', async () => {
  const createdAt = '2026-11-05T00:00:00.000Z';
  await putQueued({ id: 'z', kind: 'code', payload: '12345670', createdAt });
  await putQueued({ id: 'a', kind: 'code', payload: '4840001000014', createdAt });
  expect((await listQueued()).map(row => row.id)).toEqual(['z', 'a']);
  await deleteQueued('z');
  expect((await listQueued()).map(row => row.id)).toEqual(['a']);
  await deleteQueued('a');
});
it('treats a row without status as pending and stores a review result', async () => {
  await putQueued({ id: 'r', kind: 'code', payload: '12345670', createdAt: '2026-11-05T00:00:00.000Z' });
  expect((await listQueued())[0]).toMatchObject({ id: 'r', status: 'pending', result: null });
  await setQueuedReview('r', '{"status":"not_found"}');
  expect((await listQueued())[0]).toMatchObject({ status: 'needs_review', result: '{"status":"not_found"}' });
  await deleteQueued('r');
});