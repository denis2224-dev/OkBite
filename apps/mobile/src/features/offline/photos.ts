import * as FileSystem from 'expo-file-system/legacy';
import { randomUUID } from 'expo-crypto';
import { ro } from '../../copy/ro';
import { MissingPhotoError } from './photoErrors';

export async function keepPhoto(uri: string): Promise<string> {
  if (!FileSystem.documentDirectory) throw new Error(ro.offline.queueError);
  const directory = FileSystem.documentDirectory + 'okbite-queue/';
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const path = directory + randomUUID() + '.jpg';
  try { await FileSystem.copyAsync({ from: uri, to: path }); }
  catch (error) { await removePhoto(path).catch(() => {}); throw error; }
  return path;
}
export async function readPhoto(uri: string): Promise<string> {
  try { return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 }); }
  catch (error) {
    if (!(await FileSystem.getInfoAsync(uri)).exists) throw new MissingPhotoError();
    throw error;
  }
}
export async function removePhoto(uri: string): Promise<void> {
  await FileSystem.deleteAsync(uri, { idempotent: true });
}
