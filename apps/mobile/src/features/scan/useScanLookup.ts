import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { normalizeCode } from '@okbite/shared';
import { api } from '../../lib/api';
import { identifyCodeRoute, productRoute } from '../identify/routes';

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

  const lookup = useCallback(
    async (code: string) => {
      busy.current = true;
      failed.current = false;
      lastCode.current = code;
      setState({ status: 'working' });
      try {
        const res = await api.lookup({ code });
        setState(IDLE);
        router.replace(res.status === 'found' ? productRoute(res.product.id) : identifyCodeRoute(code));
      } catch (err) {
        failed.current = true;
        const errorCode = (err as { code?: string }).code;
        setState(errorCode === 'offline' ? { status: 'offline' } : { status: 'error', code: errorCode });
      } finally {
        busy.current = false;
      }
    },
    [router],
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

