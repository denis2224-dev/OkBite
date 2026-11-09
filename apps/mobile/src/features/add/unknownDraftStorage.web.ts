import { createStore, del, get, set } from 'idb-keyval';
import type { UnknownDraftStorage } from './unknownDraftRepository';

const drafts = createStore('okbite-unknown-draft', 'drafts');
const key = 'snapshot-v1';
export const unknownDraftStorage: UnknownDraftStorage = {
  async read() { return (await get<string>(key, drafts)) ?? null; },
  async write(value) { await set(key, value, drafts); },
  async remove() { await del(key, drafts); },
};
