import { MissingPhotoError } from './photo_errors';
import { createStore, get, set, del } from 'idb-keyval';
import { ro } from '../../copy/ro';

const photos = createStore('okbite-photos', 'photos');
type StoredPhoto = Blob | { type: string; bytes: ArrayBuffer };

// WebKit private/ephemeral contexts reject Blob values in IndexedDB, so new photos are kept as bytes.
async function loadPhoto(id: string): Promise<Blob> {
  const stored = await get<StoredPhoto>(id, photos);
  if (!stored) throw new MissingPhotoError();
  return stored instanceof Blob ? stored : new Blob([stored.bytes], { type: stored.type });
}

export async function keepPhoto(uri: string): Promise<string> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error(ro.offline.queueError);
  const blob = await response.blob();
  const id = crypto.randomUUID();
  await set(id, { type: blob.type, bytes: await blob.arrayBuffer() }, photos);
  return id;
}
export async function readPhoto(id: string): Promise<string> {
  const blob = await loadPhoto(id);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
export async function removePhoto(id: string): Promise<void> { await del(id, photos); }

export async function openPhoto(id: string) {
  const uri = URL.createObjectURL(await loadPhoto(id));
  return { uri, release() { URL.revokeObjectURL(uri); } };
}
