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
// Base64 and JSON add overhead to the backend's 2 MB request limit.
const IDENTIFY_PHOTO_MAX_BYTES = 1_450_000;

export function useCaptureFlow() {
  const router = useRouter();
  const [state, setState] = useState<CaptureState>(IDLE);
  const [canRetry, setCanRetry] = useState(false);
  const busy = useRef(false);
  const lastUri = useRef<string | null>(null);
  const prepared = useRef<Awaited<ReturnType<typeof compressPhoto>> | null>(null);
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
          prepared.current = null;
        }
        lastUri.current = uri;
        setCanRetry(true);
        const photo = prepared.current ??= await compressPhoto(uri, IDENTIFY_PHOTO_MAX_BYTES);
        currentPhotoUri = photo.uri;
        const code = await findBarcode(photo.uri);
        if (code) {
          currentCode = code;
          const hit = await api.lookup({ code });
          if (hit.status === 'found') {
            setState(IDLE);
            return router.replace(productRoute(hit.product.id));
          }
          currentCode = null;
        }
        // No readable barcode, or an unknown one: the photo itself decides.
        const result = await api.identify(photo.base64);
        setState(IDLE);
        router.replace(result.status === 'found' ? productRoute(result.product.id) : identifyPhotoRoute(result));
      } catch (err) {
        const code = (err as { code?: string } | null)?.code;
        if (code !== 'offline' || !currentPhotoUri) return setState({ status: 'error', code });
        const payloadKey = currentCode ? `code:${currentCode}` : 'photo';
        if (enqueuedPayload.current !== payloadKey) {
          try {
            await enqueue(currentCode ? { kind: 'code', code: currentCode } : { kind: 'photo', uri: currentPhotoUri });
            enqueuedPayload.current = payloadKey;
          } catch {
            return setState({ status: 'error', code: 'storage' });
          }
        }
        setState({ status: 'offline' });
        router.replace('/offline');
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
