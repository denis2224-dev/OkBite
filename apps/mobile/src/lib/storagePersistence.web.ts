import { createStore, update } from 'idb-keyval';

export const showStorageWarning = true;
const history = createStore('okbite-history', 'history');
let attempted = false;

// Called only after a committed history save; never await a browser permission in the save path.
export async function requestPersistentStorage(): Promise<void> {
  if (attempted) return;
  attempted = true;
  try {
    const storage = navigator.storage;
    if (typeof storage?.persist !== 'function') return;
    let claimed = false;
    try {
      // Atomic across tabs; survives reload and clearing history. Claim before prompting.
      await update<boolean>('storage-persistence-attempted', previous => {
        claimed = !previous;
        return true;
      }, history);
    } catch {
      // Best effort when metadata cannot be written: the document latch still applies.
      claimed = true;
    }
    if (claimed) await storage.persist();
  } catch {
    // Unsupported/blocked storage and rejected permission must not affect saved history.
  }
}
