import { createContext, createElement, useContext, useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';

type InstallEvent = Event & {
  prompt(): Promise<unknown>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
const InstallContext = createContext<ReturnType<typeof useBrowserInstallPrompt>>({ canInstall: false, isIos: false, isStandalone: false, install: async () => false, failed: false, installing: false, sheetOpen: false, openSheet: () => {}, closeSheet: () => {} });
export function InstallPromptProvider({ children }: PropsWithChildren) {
  return createElement(InstallContext.Provider, { value: useBrowserInstallPrompt() }, children);
}
export function useInstallPrompt() { return useContext(InstallContext); }
function useBrowserInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [failed, setFailed] = useState(false), [installing, setInstalling] = useState(false);
  const openSheet = useCallback(() => setSheetOpen(true), []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const [isIos] = useState(() => typeof navigator !== 'undefined' && (['iPhone', 'iPad', 'iPod'].includes(navigator.platform) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)));
  const [isStandalone, setStandalone] = useState(false);
  const pending = useRef<InstallEvent | null>(null), standalone = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    const nav = navigator as Navigator & { standalone?: boolean };
    const media = window.matchMedia?.('(display-mode: standalone)');
    const seen = new WeakSet<Event>();
    let installed = false;
    const refresh = () => {
      standalone.current = installed || !!media?.matches || nav.standalone === true;
      setStandalone(standalone.current);
      if (standalone.current) { pending.current = null; setCanInstall(false); }
    };
    const receive = (event: Event) => {
      refresh();
      if (standalone.current || seen.has(event) || typeof (event as InstallEvent).prompt !== 'function') return;
      event.preventDefault(); seen.add(event);
      pending.current = event as InstallEvent; setCanInstall(true); setFailed(false);
    };
    const onInstalled = () => { installed = true; refresh(); };
    refresh();
    window.addEventListener('beforeinstallprompt', receive);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('pageshow', refresh);
    media?.addEventListener?.('change', refresh);
    return () => {
      pending.current = null;
      window.removeEventListener('beforeinstallprompt', receive);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('pageshow', refresh);
      media?.removeEventListener?.('change', refresh);
    };
  }, []);
  const install = useCallback(async () => {
    const event = pending.current;
    if (!event || standalone.current) return false;
    pending.current = null; setCanInstall(false); setInstalling(true); setFailed(false);
    try {
      const [, choice] = await Promise.all([event.prompt(), event.userChoice]);
      return choice?.outcome === 'accepted';
    } catch { setFailed(true); return null; } finally { setInstalling(false); } // null = the browser refused to show the prompt; false = user declined
  }, []);
  return { canInstall, isIos, isStandalone, install, failed, installing, sheetOpen, openSheet, closeSheet };
}

// The invitation waits until the shopper has opened this many different product results.
export const INSTALL_AFTER_RESULTS = 2;
const DISMISS_FOR_MS = 30 * 24 * 60 * 60 * 1000;
const dismissalKey = 'okbite.install.dismissedAt.v1', resultsKey = 'okbite.install.results.v1';
const read = (key: string) => { try { return window.localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { window.localStorage.setItem(key, value); } catch {} };

let dismissedAt: number | null = null, opened: string[] | null = null;
const listeners = new Set<() => void>();
const openedResults = () => {
  if (!opened) {
    try { const saved: unknown = JSON.parse(read(resultsKey) ?? '[]'); opened = Array.isArray(saved) ? saved.filter(id => typeof id === 'string') : []; }
    catch { opened = []; }
  }
  return opened;
};
export function noteResultOpened(id: string): void {
  const ids = openedResults();
  if (ids.length >= INSTALL_AFTER_RESULTS || ids.includes(id)) return;
  opened = [...ids, id];
  write(resultsKey, JSON.stringify(opened));
  listeners.forEach(listener => listener());
}
export function useResultsOpened(): number {
  const [count, setCount] = useState(() => openedResults().length);
  useEffect(() => {
    const update = () => setCount(openedResults().length);
    listeners.add(update); update();
    return () => { listeners.delete(update); };
  }, []);
  return count;
}
export function resetInstallStateForTests(): void { dismissedAt = null; opened = null; }

/** Dismissal hides the invitation for 30 days; a blocked storage still remembers it for this session. */
export function useInstallDismissal(): readonly [boolean, () => void] {
  const [dismissed, setDismissed] = useState(() => {
    const saved = Number(read(dismissalKey));
    if (saved > 0 && saved > (dismissedAt ?? 0)) dismissedAt = saved;
    return dismissedAt !== null && Date.now() - dismissedAt < DISMISS_FOR_MS;
  });
  return [dismissed, () => {
    dismissedAt = Date.now(); setDismissed(true);
    write(dismissalKey, String(dismissedAt));
  }];
}
