import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { api } from '../../lib/api';
import { enqueue } from '../offline/queue';
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
  const enqueuedPayload = useRef<string | null>(null);

  // One request at a time: camera, gallery and retry all go through here.
  const run = useCallback(
    async (getUri: () => Promise<string | null>) => {
      if (busy.current) return;
      busy.current = true;
      setState({ status: 'working' });
      let currentPhotoUri: string | null = null;
      let currentCode: string | null = null;
      try {
        const uri = await getUri();
        if (!uri) return setState(IDLE);
        if (uri !== lastUri.current) {
          enqueuedPayload.current = null;
        }
        lastUri.current = uri;
        setCanRetry(true);
        const photo = await compressPhoto(uri);
        currentPhotoUri = photo.uri;
        const code = await findBarcode(photo.uri);
        if (code) {
          currentCode = code;
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
        if (code === 'offline') {
          const payloadKey = currentCode ? `code:${currentCode}` : currentPhotoUri ? `photo:${currentPhotoUri}` : null;
          if (payloadKey && enqueuedPayload.current !== payloadKey) {
            enqueuedPayload.current = payloadKey;
            if (currentCode) {
              await Promise.resolve(enqueue({ kind: 'code', code: currentCode })).catch(() => {});
            } else if (currentPhotoUri) {
              await Promise.resolve(enqueue({ kind: 'photo', uri: currentPhotoUri })).catch(() => {});
            }
          }
          setState({ status: 'offline' });
        } else {
          setState({ status: 'error', code });
        }
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

  const retry = useCallback(() => run(async () => lastUri.current), [run]);
  const dismiss = useCallback(() => { if (!busy.current) setState(IDLE); }, []);

  return { state, takePhoto, pickFromGallery, retry, dismiss, canRetry };
}
