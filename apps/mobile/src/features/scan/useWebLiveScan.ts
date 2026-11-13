import { useEffect, useRef, useState } from 'react';
import { createZxingReader } from '../capture/zxing.web';
import { normalizeCode } from '@okbite/shared';
import { expandUpce } from '../capture/expandUpce.web';
import { createNativeBarcodeDetector, createWasmBarcodeDetector } from './scannerStartup.web';
import { cameraAvailability, cameraFailure, type CameraIssue } from '../capture/cameraSupport.web';

const SCAN_INTERVAL_MS = 100;
const JS_FALLBACK_INTERVAL_MS = 250;
const CAPTURE_WIDTH = 1280;
const CROP_WIDTH = 0.8;
const CROP_HEIGHT = 0.35;

export type LiveStatus = 'unsupported' | 'starting' | 'live' | CameraIssue;

const mediaDevices = () => (typeof navigator === 'undefined' ? undefined : navigator.mediaDevices);

// WASM and JavaScript decoding support browsers without a native detector.
export const isLiveScanSupported = () => !cameraAvailability();

/**
 * Streams the camera into `video` and reports each valid barcode. Resolves with a stop function,
 * or null when the browser cannot do it. Rejects when the camera is refused or unavailable.
 */
export async function startLiveScan(video: HTMLVideoElement, onCode: (code: string) => void, signal?: AbortSignal): Promise<(() => void) | null> {
  if (cameraAvailability()) return null;
  const media = mediaDevices();
  if (!media?.getUserMedia || signal?.aborted) return null;
  const detector = (await createNativeBarcodeDetector()) ?? (signal?.aborted ? null : await createWasmBarcodeDetector());
  if (signal?.aborted) return null;
  let reader: Awaited<ReturnType<typeof createZxingReader>> | null = null;
  try {
    if (!detector) reader = await createZxingReader();
  } catch {
    return null; // The decoder could not load; camera access has not been requested.
  }
  if (signal?.aborted) { reader?.reset(); return null; }

  let stream: MediaStream;
  try {
    stream = await media.getUserMedia({ video: { facingMode: 'environment', width: { ideal: CAPTURE_WIDTH } }, audio: false });
  } catch (error) {
    reader?.reset();
    throw error;
  }
  let canvas: HTMLCanvasElement | undefined;
  let timer: ReturnType<typeof setInterval> | undefined = undefined;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    canvas = undefined;
    signal?.removeEventListener('abort', stop);
    reader?.reset();
    stream.getTracks().forEach((track) => track.stop());
    if (video.srcObject === stream) video.srcObject = null;
  };
  signal?.addEventListener('abort', stop, { once: true });
  if (signal?.aborted) { stop(); return null; }
  try {
    video.srcObject = stream;
    for (const track of stream.getVideoTracks?.() ?? []) enableContinuousFocus(track);
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
      if (!detector) {
        const code = await reader?.readCode(video);
        if (!stopped && code) onCode(code);
        return;
      }
      if (!video.videoWidth || !video.videoHeight) return;
      canvas ??= document.createElement('canvas');
      if (!drawCenterFrame(video, canvas)) return;
      const hits = await detector.detect(canvas);
      if (stopped) return;
      for (const { format, rawValue = '' } of hits) {
        const code = normalizeCode(format === 'upc_e' ? expandUpce(rawValue) : rawValue);
        if (!code) continue;
        onCode(code);
        break;
      }
    } catch {
      // A frame that cannot be read is skipped; the next one is tried.
    } finally {
      reading = false;
    }
  }, detector ? SCAN_INTERVAL_MS : JS_FALLBACK_INTERVAL_MS);
  return stop;
}

function drawCenterFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  const width = Math.max(1, Math.round(video.videoWidth * CROP_WIDTH));
  const height = Math.max(1, Math.round(video.videoHeight * CROP_HEIGHT));
  const x = Math.round((video.videoWidth - width) / 2);
  const y = Math.round((video.videoHeight - height) / 2);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return false;
  context.drawImage(video, x, y, width, height, 0, 0, width, height);
  return true;
}

function enableContinuousFocus(track: MediaStreamTrack) {
  try {
    const capabilities = track.getCapabilities?.() as (MediaTrackCapabilities & { focusMode?: string[] }) | undefined;
    if (!capabilities?.focusMode?.includes('continuous')) return;
    const constraints = { focusMode: 'continuous' } as MediaTrackConstraintSet;
    void track.applyConstraints({ advanced: [constraints] }).catch(() => undefined);
  } catch {
    // Focus controls are optional across mobile browsers.
  }
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
