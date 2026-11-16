import { useCallback, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { ReadLabelRequest, ReadLabelResponse } from '@okbite/shared';
import { api } from '../../lib/api';
import { compressPhoto } from '../capture/compressPhoto';
import type { AnalysisFlowState } from '../capture/StatusPanel';
import { useScreenActivity } from '../capture/useScreenActivity';
import { parseAddParams } from '../identify/routes';
import {
  getAvailableCategories,
  initializeAvailableCategories,
  setAddReviewDraft,
} from './draftStore';

export type AddFlowState = AnalysisFlowState;

type Camera = { takePictureAsync(): Promise<{ uri: string } | undefined> };

const IDLE: AddFlowState = { status: 'idle' };
const SINGLE_PHOTO_MAX_BYTES = 1_450_000;
const TWO_PHOTO_MAX_BYTES = 700_000;
const MAX_REQUEST_UTF8_BYTES = 2_000_000;

function utf8ByteLength(str: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str).byteLength;
  }
  return encodeURIComponent(str).replace(/%[A-F\d]{2}/g, 'U').length;
}

export function useAddFlow() {
  const router = useRouter();
  const rawParams = useLocalSearchParams<Record<string, string | string[] | undefined>>();
  const [step, setStep] = useState<1 | 2>(1);
  const [state, setState] = useState<AddFlowState>(IDLE);
  const [canRetry, setCanRetry] = useState(false);
  const busy = useRef(false);
  // Only the screen that started a request, still focused, may act on its answer.
  const activity = useScreenActivity();
  const ingredientsUriRef = useRef<string | null>(null);
  const lastAttemptRef = useRef<{ ingredientsUri: string; nutritionUri: string | null } | null>(null);
  const pendingOutcomeRef = useRef(false);
  // The label photo being read stays on screen instead of the live camera.
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const setFailure = useCallback(
    (err: unknown, token: number) => {
      const code = (err as { code?: string } | null)?.code;
      const extra = pendingOutcomeRef.current ? { afterPending: true } : {};
      if (activity.isCurrent(token)) {
        setState(code === 'offline' ? { status: 'offline', ...extra } : { status: 'error', code, ...extra });
      }
    },
    [activity],
  );

  const submitPair = useCallback(
    async (ingredientsUri: string, nutritionUri: string | null, token: number) => {
      pendingOutcomeRef.current = false;
      lastAttemptRef.current = { ingredientsUri, nutritionUri };
      setPhotoUri(nutritionUri ?? ingredientsUri);
      setCanRetry(true);
      const budget = nutritionUri === null ? SINGLE_PHOTO_MAX_BYTES : TWO_PHOTO_MAX_BYTES;
      const ingPhoto = await compressPhoto(ingredientsUri, budget);
      const nutPhoto = nutritionUri ? await compressPhoto(nutritionUri, budget) : null;

      const reqCandidate = {
        ingredientsImage: ingPhoto.base64,
        nutritionImage: nutPhoto ? nutPhoto.base64 : null,
      };
      const parsedReq = ReadLabelRequest.safeParse(reqCandidate);
      if (
        !parsedReq.success ||
        utf8ByteLength(JSON.stringify(parsedReq.data)) > MAX_REQUEST_UTF8_BYTES
      ) {
        throw Object.assign(new Error('bad_request'), { code: 'bad_request' });
      }

      if (!activity.isCurrent(token)) return;
      const outcome = await api.readLabelOutcome(parsedReq.data);
      let rawResponse: unknown;
      if (outcome.status === 'pending') {
        pendingOutcomeRef.current = true;
        if (activity.isCurrent(token)) setState({ status: 'pending' });
        rawResponse = await outcome.completion;
      } else {
        rawResponse = outcome.result;
      }
      if (!activity.isCurrent(token)) return;
      const parsedRes = ReadLabelResponse.safeParse(rawResponse);
      if (
        !parsedRes.success ||
        !parsedRes.data.ingredientsPhotoPath.trim() ||
        (parsedRes.data.nutritionPhotoPath !== null && !parsedRes.data.nutritionPhotoPath.trim())
      ) {
        throw Object.assign(new Error('invalid_response'), { code: 'invalid_response' });
      }

      if (getAvailableCategories().length === 0) {
        initializeAvailableCategories();
      }
      setAddReviewDraft({
        initial: parseAddParams(rawParams),
        label: parsedRes.data,
      });
      setState(IDLE);
      router.replace('/add/review');
    },
    [activity, rawParams, router],
  );

  const handleCapturedUri = useCallback(
    async (getUri: () => Promise<string | null>) => {
      if (busy.current) return;
      busy.current = true;
      pendingOutcomeRef.current = false;
      setPhotoUri(null);
      const token = activity.start();
      try {
        const uri = await getUri();
        if (!activity.isCurrent(token)) return;
        if (!uri) {
          setState(IDLE);
          return;
        }
        if (step === 1 || !ingredientsUriRef.current) {
          ingredientsUriRef.current = uri;
          setStep(2);
          setState(IDLE);
          return;
        }
        setState({ status: 'working' });
        await submitPair(ingredientsUriRef.current, uri, token);
      } catch (err) {
        setFailure(err, token);
      } finally {
        busy.current = false;
        if (!activity.isCurrent(token)) setState(IDLE); // no spinner left behind
      }
    },
    [activity, setFailure, step, submitPair],
  );

  const takePhoto = useCallback(
    async (camera: Camera | null) => {
      if (camera) await handleCapturedUri(async () => (await camera.takePictureAsync())?.uri ?? null);
    },
    [handleCapturedUri],
  );

  const pickFromGallery = useCallback(
    () =>
      handleCapturedUri(async () => {
        const picked = await launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
        return picked.canceled ? null : (picked.assets[0]?.uri ?? null);
      }),
    [handleCapturedUri],
  );

  const submitSamePhoto = useCallback(async () => {
    if (busy.current || !ingredientsUriRef.current) return;
    busy.current = true;
    const token = activity.start();
    setState({ status: 'working' });
    try {
      await submitPair(ingredientsUriRef.current, null, token);
    } catch (err) {
      setFailure(err, token);
    } finally {
      busy.current = false;
      if (!activity.isCurrent(token)) setState(IDLE); // no spinner left behind
    }
  }, [activity, setFailure, submitPair]);

  const retry = useCallback(async () => {
    const attempt = lastAttemptRef.current;
    if (busy.current || !attempt) return;
    busy.current = true;
    const token = activity.start();
    setState({ status: 'working' });
    try {
      await submitPair(attempt.ingredientsUri, attempt.nutritionUri, token);
    } catch (err) {
      setFailure(err, token);
    } finally {
      busy.current = false;
      if (!activity.isCurrent(token)) setState(IDLE); // no spinner left behind
    }
  }, [activity, setFailure, submitPair]);

  const dismiss = useCallback(() => {
    if (!busy.current) setState(IDLE);
  }, []);

  return {
    step,
    state,
    takePhoto,
    pickFromGallery,
    submitSamePhoto,
    retry,
    dismiss,
    canRetry: canRetry && state.status !== 'pending',
    photoUri,
  };
}
