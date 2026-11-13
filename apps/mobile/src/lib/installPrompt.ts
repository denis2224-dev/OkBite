import type { PropsWithChildren } from 'react';
export function InstallPromptProvider({ children }: PropsWithChildren) { return children; }
export function useInstallPrompt() {
  return { canInstall: false, isIos: false, isStandalone: false, install: async (): Promise<boolean | null> => false, failed: false, installing: false, sheetOpen: false, openSheet: () => {}, closeSheet: () => {} };
}
export function useInstallDismissal(): readonly [boolean, () => void] { return [false, () => {}]; }
export const INSTALL_AFTER_RESULTS = 2;
export function noteResultOpened(_id: string): void {}
export function useResultsOpened(): number { return 0; }
export function resetInstallStateForTests(): void {}
