import { ro } from '../../copy/ro';

export async function withQueueLock<T>(work: () => Promise<T>): Promise<T> {
  // Unsupported/insecure browsers retain captures instead of risking duplicate uploads.
  if (typeof navigator === 'undefined' || !navigator.locks) throw new Error(ro.offline.queueError);
  return navigator.locks.request('okbite-offline-queue', work);
}
