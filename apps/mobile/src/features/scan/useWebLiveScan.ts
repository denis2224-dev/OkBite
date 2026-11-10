import { useEffect, useRef, useState } from 'react';
import { createZxingReader } from '../capture/zxing.web';
import { createDetector, firstValidCode } from '../capture/findBarcode.web';
import { cameraAvailability, cameraFailure, type CameraIssue } from '../capture/cameraSupport.web';

const SCAN_INTERVAL_MS = 250;

export type LiveStatus = 'unsupported' | 'starting' | 'live' | CameraIssue;

const mediaDevices = () => (typeof navigator === 'undefined' ? undefined : navigator.mediaDevices);

// ZXing covers browsers without BarcodeDetector, so only camera access decides support.
export const isLiveScanSupported = () => !cameraAvailability();

/**
 * Streams the camera into `video` and reports each valid barcode. Resolves with a stop function,
 * or null when the browser cannot do it. Rejects when the camera is refused or unavailable.
 */
export async function startLiveScan(video: HTMLVideoElement, onCode: (code: string) => void, signal?: AbortSignal): Promise<(() => void) | null> {
  if (cameraAvailability()) return null;
  const detector = await createDetector();
  const media = mediaDevices();
  if (!media?.getUserMedia || signal?.aborted) return null;
  let reader: Awaited<ReturnType<typeof createZxingReader>> | null = null;
  try {
    if (!detector) reader = await createZxingReader();
  } catch {
    return null; // The decoder could not load; camera access has not been requested.
  }
  if (signal?.aborted) { reader?.reset(); return null; }

  let stream: MediaStream;
  try {
    stream = await media.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  } catch (error) {
    reader?.reset();
    throw error;
  }
  let timer: ReturnType<typeof setInterval> | undefined = undefined;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    signal?.removeEventListener('abort', stop);
    reader?.reset();
    stream.getTracks().forEach((track) => track.stop());
    if (video.srcObject === stream) video.srcObject = null;
  };
  signal?.addEventListener('abort', stop, { once: true });
  if (signal?.aborted) { stop(); return null; }
  try {
    video.srcObject = stream;
    await video.play();
  } catch (err) {
    stop();
    throw err;
  }
  if (stopped) return null;
  let reading = false;
  timer = setInterval(async () => {
    if (reading || stopped) return;
    reading = true;
    try {
      const code = detector
        ? await firstValidCode(detector, video)
        : await reader!.readCode(video);
      if (!stopped && code) onCode(code);
    } catch {
      // A frame that cannot be read is skipped; the next one is tried.
    } finally {
      reading = false;
    }
  }, SCAN_INTERVAL_MS);
  return stop;
}

export function useWebLiveScan(onCode: (code: string) => void) {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<LiveStatus>(() => cameraAvailability() ?? (isLiveScanSupported() ? 'starting' : 'unsupported'));
  const latest = useRef(onCode);
  useEffect(() => { latest.current = onCode; });

  useEffect(() => {
    if (!video) return;
    let cancelled = false;
    const controller = new AbortController();
    let stop: (() => void) | null = null;
    startLiveScan(video, (code) => {
      if (!cancelled) latest.current(code);
    }, controller.signal).then(
      (stopFn) => {
        if (cancelled) return stopFn?.(); // unmounted while the camera was starting: release it right away
        stop = stopFn;
        setStatus(stopFn ? 'live' : 'unsupported');
      },
      error => { if (!cancelled) setStatus(cameraFailure(error)); },
    );
    return () => {
      cancelled = true;
      controller.abort();
      stop?.();
    };
  }, [video, attempt]);

  const retry = () => { setStatus('starting'); setAttempt((n) => n + 1); };
  return { status, videoRef: setVideo, retry };
}
