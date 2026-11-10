import * as FileSystem from 'expo-file-system/legacy';
import type { UnknownDraftStorage } from './unknownDraftRepository';

function snapshotPath(): string {
  if (!FileSystem.documentDirectory) throw new Error('Draft storage unavailable');
  return FileSystem.documentDirectory + 'okbite-unknown-draft-v1.json';
}

export const unknownDraftStorage: UnknownDraftStorage = {
  async read() {
    const path = snapshotPath();
    return (await FileSystem.getInfoAsync(path)).exists
      ? FileSystem.readAsStringAsync(path) : null;
  },
  async write(value) { await FileSystem.writeAsStringAsync(snapshotPath(), value); },
  async remove() { await FileSystem.deleteAsync(snapshotPath(), { idempotent: true }); },
};
