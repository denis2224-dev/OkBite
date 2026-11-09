import { useCallback, useRef, useState } from 'react';
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
  | { status: 'working'; uri?: string }
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
  const busy = useRef(false);
  // Only the screen that started a request, still focused, may act on its answer.
  const activity = useScreenActivity();
  const lastUri = useRef<string | null>(null);

  // One request at a time: camera, gallery and retry all go through here.
  const run = useCallback(
    async (getUri: () => Promise<string | null>) => {
      if (busy.current) return;
      busy.current = true;
      const token = activity.start();
      const current = () => activity.isCurrent(token);
      setState({ status: 'working' });
      let compressedUri: string | undefined;
      try {
        const uri = await getUri();
        if (!current()) return;
        if (!uri) return setState(IDLE);
        setState({ status: 'working', uri });
        lastUri.current = uri;
        setCanRetry(true);
        const photo = await compressPhoto(uri, IDENTIFY_PHOTO_MAX_BYTES);
        compressedUri = photo.uri;
        const code = await findBarcode(photo.uri);
        if (!current()) return;
        if (code) {
          const hit = await api.lookup({ code });
          if (!current()) return;
          if (hit.status === 'found') {
            setState(IDLE);
            return router.replace(productRoute(hit.product.id));
          }
        }
        // No readable barcode, or an unknown one: the photo itself decides.
        const result = await api.identify(photo.base64);
        if (!current()) return;
        setState(IDLE);
        router.replace(result.status === 'found' ? productRoute(result.product.id) : identifyPhotoRoute(result));
      } catch (err) {
        const code = (err as { code?: string } | null)?.code;
        if (code === 'offline' && compressedUri) {
          try {
            await enqueue({ kind: 'photo', uri: compressedUri });
            if (!current()) return;
            lastUri.current = null;
            setCanRetry(false);
            setState(IDLE);
            router.replace('/offline');
            return;
          } catch { /* Keep the original photo available for retry if durable storage fails. */ }
        }
        if (current()) setState(code === 'offline' ? { status: 'offline' } : { status: 'error', code });
      } finally {
        busy.current = false;
        if (!current()) setState(IDLE); // a stale answer leaves no spinner behind
      }
    },
    [activity, router],
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
