import { useState } from 'react';

export const storageNoticeKey = 'okbite.history.storageNotice.dismissed.v1';

// Remembers, per browser, that the one-line "history is saved only in this browser" notice was closed.
export function useStorageNoticeDismissal(): readonly [boolean, () => void] {
  const [dismissed, setDismissed] = useState(() => {
    try { return window.localStorage.getItem(storageNoticeKey) === '1'; } catch { return false; }
  });
  return [dismissed, () => {
    setDismissed(true);
    try { window.localStorage.setItem(storageNoticeKey, '1'); } catch {}
  }];
}
