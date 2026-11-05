import 'fake-indexeddb/auto';
import { serialize, deserialize } from 'node:v8';
import { writeHistory, readHistory, deleteHistory } from './db.web';

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
