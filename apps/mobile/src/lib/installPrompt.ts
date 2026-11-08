export function useInstallPrompt() {
  return { canInstall: false, isIos: false, isStandalone: false, install: async () => false };
}
export function useInstallDismissal(): readonly [boolean, () => void] { return [false, () => {}]; }
