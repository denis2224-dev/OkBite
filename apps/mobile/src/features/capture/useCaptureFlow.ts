import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { api } from '../../lib/api';
import { identifyPhotoRoute, productRoute } from '../identify/routes';
import { compressPhoto } from './compressPhoto';
import { findBarcode } from './findBarcode';

export type CaptureState =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'offline' }
  | { status: 'error'; code?: string };

type Camera = { takePictureAsync(): Promise<{ uri: string } | undefined> };

const IDLE: CaptureState = { status: 'idle' };

export function useCaptureFlow() {
  const router = useRouter();
  const [state, setState] = useState<CaptureState>(IDLE);
  const [canRetry, setCanRetry] = useState(false);
  const busy = useRef(false);
  const lastUri = useRef<string | null>(null);

  // One request at a time: camera, gallery and retry all go through here.
  const run = useCallback(
    async (getUri: () => Promise<string | null>) => {
      if (busy.current) return;
      busy.current = true;
      setState({ status: 'working' });
      try {
        const uri = await getUri();
        if (!uri) return setState(IDLE);
        lastUri.current = uri;
        setCanRetry(true);
        const photo = await compressPhoto(uri);
        const code = await findBarcode(photo.uri);
        if (code) {
          const hit = await api.lookup({ code });
          if (hit.status === 'found') {
            setState(IDLE);
            return router.replace(productRoute(hit.product.id));
          }
        }
        // No readable barcode, or an unknown one: the photo itself decides.
        const result = await api.identify(photo.base64);
        setState(IDLE);
        router.replace(result.status === 'found' ? productRoute(result.product.id) : identifyPhotoRoute(result));
      } catch (err) {
        const code = (err as { code?: string }).code;
        setState(code === 'offline' ? { status: 'offline' } : { status: 'error', code });
      } finally {
        busy.current = false;
      }
    },
    [router],
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

  // shortcut: with R4 B6 merged, offline will call enqueue({ kind: 'photo', uri }) and open /offline (B2 step 2c).
  const retry = useCallback(() => run(async () => lastUri.current), [run]);
  const dismiss = useCallback(() => { if (!busy.current) setState(IDLE); }, []);

  return { state, takePhoto, pickFromGallery, retry, dismiss, canRetry };
}
