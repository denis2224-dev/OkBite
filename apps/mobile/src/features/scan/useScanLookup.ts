import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { normalizeCode } from '@okbite/shared';
import { api } from '../../lib/api';
import { enqueue } from '../offline/queue';
import { identifyCodeRoute, productRoute } from '../identify/routes';
import { useScreenActivity } from '../capture/useScreenActivity';

export type ScanState =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'offline' }
  | { status: 'error'; code?: string };

const IDLE: ScanState = { status: 'idle' };

/** Looks a barcode up by code. Camera detections repeat every frame, so they are ignored while a request runs and after a failure until dismissed. */
export function useScanLookup(onCameraAccept?: () => void) {
  const router = useRouter();
  const [state, setState] = useState<ScanState>(IDLE);
  const busy = useRef(false);
  const failed = useRef(false);
  const lastCode = useRef<string | null>(null);
  const enqueuedCode = useRef<string | null>(null);
  const { start, isCurrent } = useScreenActivity(() => { failed.current = false; setState(IDLE); });

  const lookup = useCallback(
    async (code: string) => {
      const token = start();
      if (!isCurrent(token)) return;
      busy.current = true;
      failed.current = false;
      if (code !== lastCode.current) {
        enqueuedCode.current = null;
      }
      lastCode.current = code;
      setState({ status: 'working' });
      try {
        const res = await api.lookup({ code });
        enqueuedCode.current = null;
        if (!isCurrent(token)) return;
        setState(IDLE);
        router.replace(res.status === 'found' ? productRoute(res.product.id) : identifyCodeRoute(code));
      } catch (err) {
        if (isCurrent(token)) failed.current = true;
        const errorCode = (err as { code?: string } | null)?.code;
        if (errorCode === 'offline') {
          if (enqueuedCode.current !== code) {
            try {
              await enqueue({ kind: 'code', code });
              enqueuedCode.current = code;
            } catch { /* Keep retry available until the code is durably saved. */ }
          }
          if (isCurrent(token)) setState({ status: 'offline' });
        } else {
          if (isCurrent(token)) setState({ status: 'error', code: errorCode });
        }
      } finally {
        busy.current = false;
        if (isCurrent(start())) setState(previous => previous.status === 'working' ? IDLE : previous);
      }
    },
    [router, start, isCurrent],
  );

  const onCameraCode = useCallback(
    (raw: string) => {
      const code = normalizeCode(raw);
      if (!code || busy.current || failed.current) return;
      onCameraAccept?.();
      return lookup(code);
    },
    [lookup, onCameraAccept],
  );

  const onManualCode = useCallback(
    (raw: string) => {
      const code = normalizeCode(raw);
      if (code && !busy.current) return lookup(code);
    },
    [lookup],
  );

  const retry = useCallback(() => {
    if (lastCode.current && !busy.current) return lookup(lastCode.current);
  }, [lookup]);

  const dismiss = useCallback(() => {
    if (busy.current) return;
    failed.current = false;
    setState(IDLE);
  }, []);

  return { state, onCameraCode, onManualCode, retry, dismiss };
}
