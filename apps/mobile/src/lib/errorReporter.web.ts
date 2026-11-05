import Constants from 'expo-constants';
import { reportClientError, setErrorScreen } from './errorReporter.shared';
export { setErrorScreen } from './errorReporter.shared';

let installed = false;
export function installErrorReporter(): void {
  if (installed || typeof window === 'undefined') return;
  const report = (error: Error) => {
    setErrorScreen(window.location.pathname);
    void reportClientError(error, 'web', Constants.expoConfig?.version ?? 'unknown');
  };
  window.addEventListener('error', event => report(event.error instanceof Error ? event.error : new Error(event.message)));
  window.addEventListener('unhandledrejection', event => report(event.reason instanceof Error ? event.reason : new Error('Unhandled rejection')));
  installed = true;
}
