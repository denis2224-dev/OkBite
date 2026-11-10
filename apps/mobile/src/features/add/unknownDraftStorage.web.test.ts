import 'fake-indexeddb/auto';
import { deserialize, serialize } from 'node:v8';
import { unknownDraftStorage } from './unknownDraftStorage.web';

it('keeps web JSON after module reload and removes the saved draft', async () => {
  const clone = global.structuredClone;
  global.structuredClone = value => deserialize(serialize(value));
  try {
    expect(await unknownDraftStorage.read()).toBeNull();
    await unknownDraftStorage.write('{"id":"draft-a"}');
    jest.resetModules();
    const reloaded = jest.requireActual<typeof import('./unknownDraftStorage.web')>('./unknownDraftStorage.web').unknownDraftStorage;
    expect(await reloaded.read()).toBe('{"id":"draft-a"}');
    await reloaded.remove();
    expect(await reloaded.read()).toBeNull();
  } finally { global.structuredClone = clone; }
});
