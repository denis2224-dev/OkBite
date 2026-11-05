import 'fake-indexeddb/auto';
import { serialize, deserialize } from 'node:v8';
import { writeHistory, readHistory, deleteHistory, putQueued, listQueued, deleteQueued, saveQueuedState } from './db.web';

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

it('persists review metadata without changing same-millisecond FIFO ordering', async () => {
  const createdAt = '2026-11-05T00:00:00.000Z';
  await putQueued({ id: 'first', kind: 'code', payload: '12345670', createdAt });
  await putQueued({ id: 'second', kind: 'code', payload: '4840001000014', createdAt });
  await saveQueuedState('first', JSON.stringify({ outcome: { status: 'not_found' } }));
  const rows = await listQueued();
  expect(rows.map(row => row.id)).toEqual(['first', 'second']);
  expect(JSON.parse(rows[0]!.state!)).toEqual({ outcome: { status: 'not_found' } });
  await deleteQueued('first'); await deleteQueued('second');
});
