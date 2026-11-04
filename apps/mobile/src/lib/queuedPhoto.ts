import * as FileSystem from "expo-file-system/legacy";
import { randomUUID } from "expo-crypto";
export async function keepPhoto(uri: string) {
  const directory = FileSystem.documentDirectory + "okbite-queue/";
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const path = directory + randomUUID() + ".jpg";
  await FileSystem.copyAsync({ from: uri, to: path });
  return path;
}
export async function readPhoto(uri: string) {
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}
export async function removePhoto(uri: string) {
  await FileSystem.deleteAsync(uri, { idempotent: true });
}
