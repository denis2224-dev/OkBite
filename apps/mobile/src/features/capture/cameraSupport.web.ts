import { ro } from '../../copy/ro';

export type CameraIssue = 'insecure' | 'unavailable' | 'denied' | 'busy';
export function cameraAvailability(): CameraIssue | undefined {
  if (globalThis.isSecureContext === false) return 'insecure';
  if (typeof navigator === 'undefined' || typeof navigator.mediaDevices?.getUserMedia !== 'function') return 'unavailable';
}
export function cameraFailure(error: unknown): CameraIssue {
  const name = (error as { name?: string } | null)?.name;
  return name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotReadableError' ? 'busy' : 'unavailable';
}
export const cameraMessage = (issue: CameraIssue) => ({
  insecure: ro.pwa.camera.httpsRequired, unavailable: ro.pwa.camera.unavailable,
  denied: ro.pwa.camera.browserDenied, busy: ro.pwa.camera.busy,
})[issue];
