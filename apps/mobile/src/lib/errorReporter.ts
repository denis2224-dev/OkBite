import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { reportClientError } from './errorReporter.shared';
export { setErrorScreen } from './errorReporter.shared';

type Handler = (error: Error, fatal?: boolean) => void;
type ErrorUtils = { getGlobalHandler(): Handler; setGlobalHandler(handler: Handler): void };
let installed = false;

export function installErrorReporter(): void {
  const utils = (globalThis as typeof globalThis & { ErrorUtils?: ErrorUtils }).ErrorUtils;
  if (installed || !utils) return;
  const previous = utils.getGlobalHandler();
  utils.setGlobalHandler((error, fatal) => {
    void reportClientError(error, Platform.OS, Constants.expoConfig?.version ?? 'unknown');
    previous(error, fatal);
  });
  installed = true;
}
