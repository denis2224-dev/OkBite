import { createStore, get, set, del } from 'idb-keyval';

const store = createStore('okbite-profile', 'profile');

export async function readProfile(): Promise<string | null> {
  return (await get<string>('profile', store)) ?? null;
}

export async function writeProfile(json: string): Promise<void> {
  await set('profile', json, store);
}

export async function deleteProfile(): Promise<void> {
  await del('profile', store);
}

