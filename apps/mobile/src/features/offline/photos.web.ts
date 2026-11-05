import { createStore, get, set, del } from 'idb-keyval';
import { ro } from '../../copy/ro';
import { MissingPhotoError } from './photoErrors';

const photos = createStore('okbite-photos', 'photos');
export async function keepPhoto(uri: string): Promise<string> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error(ro.offline.queueError);
  const id = crypto.randomUUID();
  await set(id, await response.blob(), photos);
  return id;
}
export async function readPhoto(id: string): Promise<string> {
  const blob = await get<Blob>(id, photos);
  if (!blob) throw new MissingPhotoError();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
export async function removePhoto(id: string): Promise<void> { await del(id, photos); }
