import { useEffect, useRef, useState } from 'react';
import { createDetector, firstValidCode } from '../capture/findBarcode.web';

const SCAN_INTERVAL_MS = 250;

export type LiveStatus = 'unsupported' | 'starting' | 'live' | 'unavailable';

const mediaDevices = () => (typeof navigator === 'undefined' ? undefined : navigator.mediaDevices);

export const isLiveScanSupported = () => 'BarcodeDetector' in globalThis && !!mediaDevices()?.getUserMedia;

/**
 * Streams the camera into `video` and reports each valid barcode. Resolves with a stop function,
 * or null when the browser cannot do it. Rejects when the camera is refused or unavailable.
 */
export async function startLiveScan(video: HTMLVideoElement, onCode: (code: string) => void): Promise<(() => void) | null> {
  const detector = await createDetector();
  const media = mediaDevices();
  if (!detector || !media?.getUserMedia) return null;

  const stream = await media.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  let timer: ReturnType<typeof setInterval> | undefined = undefined;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  };
  try {
    video.srcObject = stream;
    await video.play();
  } catch (err) {
    stop();
    throw err;
  }
  let reading = false;
  timer = setInterval(async () => {
    if (reading || stopped) return;
    reading = true;
    try {
      const code = await firstValidCode(detector, video);
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
  const [status, setStatus] = useState<LiveStatus>(() => (isLiveScanSupported() ? 'starting' : 'unsupported'));
  const latest = useRef(onCode);
  useEffect(() => { latest.current = onCode; });

  useEffect(() => {
    if (!video) return;
    let cancelled = false;
    let stop: (() => void) | null = null;
    startLiveScan(video, (code) => {
      if (!cancelled) latest.current(code);
    }).then(
      (stopFn) => {
        if (cancelled) return stopFn?.(); // unmounted while the camera was starting: release it right away
        stop = stopFn;
        setStatus(stopFn ? 'live' : 'unsupported');
      },
      () => { if (!cancelled) setStatus('unavailable'); },
    );
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [video, attempt]);

  const retry = () => { setStatus('starting'); setAttempt((n) => n + 1); };
  return { status, videoRef: setVideo, retry };
}
