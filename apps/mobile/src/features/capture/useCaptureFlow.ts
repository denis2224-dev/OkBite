import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { api } from '../../lib/api';
import { identifyPhotoRoute, productRoute } from '../identify/routes';
import { enqueue } from '../offline/queue';
import { compressPhoto } from './compressPhoto';
import { findBarcode } from './findBarcode';
import { useScreenActivity } from './useScreenActivity';

export type CaptureState =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'offline' }
  | { status: 'error'; code?: string };

type Camera = { takePictureAsync(): Promise<{ uri: string } | undefined> };

const IDLE: CaptureState = { status: 'idle' };
// Base64 adds a third plus JSON overhead; stay within readJsonBody's 2 MB limit.
const IDENTIFY_PHOTO_MAX_BYTES = 1_450_000;

export function useCaptureFlow() {
  const router = useRouter();
  const [state, setState] = useState<CaptureState>(IDLE);
  const [canRetry, setCanRetry] = useState(false);
  const { start, isCurrent } = useScreenActivity(() => setState(IDLE));
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const lastUri = useRef<string | null>(null);

  // One request at a time: camera, gallery and retry all go through here.
  const run = useCallback(
    async (getUri: () => Promise<string | null>) => {
      const token = start();
      if (busy.current || !isCurrent(token)) return;
      busy.current = true;
      setState({ status: 'working' });
      let compressedUri: string | undefined;
      try {
        const uri = await getUri();
        if (!mounted.current || !isCurrent(token)) return;
        if (!uri) return setState(IDLE);
        lastUri.current = uri;
        setCanRetry(true);
        const photo = await compressPhoto(uri, IDENTIFY_PHOTO_MAX_BYTES);
        compressedUri = photo.uri;
        const code = await findBarcode(photo.uri);
        if (!mounted.current || !isCurrent(token)) return;
        if (code) {
          const hit = await api.lookup({ code });
          if (!mounted.current || !isCurrent(token)) return;
          if (hit.status === 'found') {
            setState(IDLE);
            return router.replace(productRoute(hit.product.id));
          }
        }
        // No readable barcode, or an unknown one: the photo itself decides.
        const result = await api.identify(photo.base64);
        if (!mounted.current || !isCurrent(token)) return;
        setState(IDLE);
        router.replace(result.status === 'found' ? productRoute(result.product.id) : identifyPhotoRoute(result));
      } catch (err) {
        const code = (err as { code?: string } | null)?.code;
        if (code === 'offline' && compressedUri) {
          try {
            await enqueue({ kind: 'photo', uri: compressedUri });
            lastUri.current = null;
            if (!mounted.current || !isCurrent(token)) return;
            setCanRetry(false);
            setState(IDLE);
            router.replace('/offline');
            return;
          } catch { /* Keep the original photo available for retry if durable storage fails. */ }
        }
        if (mounted.current && isCurrent(token)) setState(code === 'offline' ? { status: 'offline' } : { status: 'error', code });
      } finally {
        busy.current = false;
        if (mounted.current && isCurrent(start())) setState(previous => previous.status === 'working' ? IDLE : previous);
      }
    },
    [router, start, isCurrent],
  );

  const takePhoto = useCallback(
    async (camera: Camera | null) => {
      if (camera) await run(async () => (await camera.takePictureAsync())?.uri ?? null);
    },
    [run],
  );

  const pickFromGallery = useCallback(
    () =>
      run(async () => {
        const picked = await launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
        return picked.canceled ? null : (picked.assets[0]?.uri ?? null);
      }),
    [run],
  );

  const retry = useCallback(() => run(async () => lastUri.current), [run]);
  const dismiss = useCallback(() => { if (!busy.current) setState(IDLE); }, []);

  return { state, takePhoto, pickFromGallery, retry, dismiss, canRetry };
}
