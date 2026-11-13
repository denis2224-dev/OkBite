import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { launchImageLibraryAsync } from 'expo-image-picker';
import type { IdentifyResponse } from '@okbite/shared';
import { api } from '../../lib/api';
import { identifyPhotoRoute, isGuidedAddEnabled, productRoute } from '../identify/routes';
import { keepPhoto, removePhoto } from '../offline/photos';
import { enqueue } from '../offline/queue';
import { compressPhoto } from './compressPhoto';
import { findBarcode } from './findBarcode';
import type { AnalysisFlowState } from './StatusPanel';
import { useScreenActivity } from './useScreenActivity';

export type CaptureState = AnalysisFlowState;

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
  // The photo being analysed stays on screen instead of the live camera.
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // One request at a time: camera, gallery and retry all go through here.
  const run = useCallback(
    async (getUri: () => Promise<string | null>) => {
      if (busy.current) return;
      busy.current = true;
      const token = activity.start();
      const current = () => activity.isCurrent(token);
      setState({ status: 'working' });
      setPhotoUri(null);
      let compressedUri: string | undefined;
      let frontPhotoId: string | undefined;
      let awaitedPending = false;
      try {
        const uri = await getUri();
        if (!current()) return;
        if (!uri) return setState(IDLE);
        lastUri.current = uri;
        setPhotoUri(uri);
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
        if (isGuidedAddEnabled()) {
          frontPhotoId = await keepPhoto(photo.uri);
          if (!current()) {
            await removePhoto(frontPhotoId).catch(() => {});
            return;
          }
        }
        // No readable barcode, or an unknown one: the photo itself decides.
        const outcome = await api.identifyOutcome(photo.base64);
        let result: IdentifyResponse;
        if (outcome.status === 'pending') {
          awaitedPending = true;
          if (current()) setState({ status: 'pending' });
          result = await outcome.completion;
        } else {
          result = outcome.result;
        }
        if (!current()) {
          if (frontPhotoId) await removePhoto(frontPhotoId).catch(() => {});
          return;
        }
        setState(IDLE);
        if (result.status === 'found') {
          if (frontPhotoId) await removePhoto(frontPhotoId).catch(() => {});
          router.replace(productRoute(result.product.id));
          return;
        }
        router.replace(identifyPhotoRoute(result, frontPhotoId));
      } catch (err) {
        if (frontPhotoId) await removePhoto(frontPhotoId).catch(() => {});
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
        const extra = awaitedPending ? { afterPending: true } : {};
        if (current()) setState(code === 'offline' ? { status: 'offline', ...extra } : { status: 'error', code, ...extra });
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

  return { state, takePhoto, pickFromGallery, retry, dismiss, canRetry: canRetry && state.status !== 'pending', photoUri };
}
