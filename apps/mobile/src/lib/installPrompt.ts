import type { PropsWithChildren } from 'react';
export function InstallPromptProvider({ children }: PropsWithChildren) { return children; }
export function useInstallPrompt() {
  return { canInstall: false, isIos: false, isStandalone: false, install: async () => false };
}
export function useInstallDismissal(): readonly [boolean, () => void] { return [false, () => {}]; }
