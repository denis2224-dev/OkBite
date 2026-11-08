import { createContext, createElement, useContext, useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';

type InstallEvent = Event & {
  prompt(): Promise<unknown>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
const InstallContext = createContext<ReturnType<typeof useBrowserInstallPrompt>>({ canInstall: false, isIos: false, isStandalone: false, install: async () => false });
export function InstallPromptProvider({ children }: PropsWithChildren) {
  return createElement(InstallContext.Provider, { value: useBrowserInstallPrompt() }, children);
}
export function useInstallPrompt() { return useContext(InstallContext); }
function useBrowserInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
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
      pending.current = event as InstallEvent; setCanInstall(true);
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
    pending.current = null; setCanInstall(false);
    try {
      const [, choice] = await Promise.all([event.prompt(), event.userChoice]);
      return choice?.outcome === 'accepted';
    } catch { return false; }
  }, []);
  return { canInstall, isIos, isStandalone, install };
}

let dismissedInSession = false;
const dismissalKey = 'okbite.install.dismissed.v1';
export function useInstallDismissal(): readonly [boolean, () => void] {
  const [dismissed, setDismissed] = useState(() => {
    try { if (window.localStorage.getItem(dismissalKey) === '1') dismissedInSession = true; } catch {}
    return dismissedInSession;
  });
  return [dismissed, () => {
    dismissedInSession = true; setDismissed(true);
    try { window.localStorage.setItem(dismissalKey, '1'); } catch {}
  }];
}
