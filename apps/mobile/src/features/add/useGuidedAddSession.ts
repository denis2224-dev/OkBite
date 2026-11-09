import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { api } from '../../lib/api';
import { compressPhoto } from '../capture/compressPhoto';
import { useScreenActivity } from '../capture/useScreenActivity';
import { identifyPhotoRoute, productRoute } from '../identify/routes';
import { keepPhoto, openPhoto, removePhoto } from '../offline/photos';
import { completeUnknownDraft } from './completeUnknownDraft';
import { draftToGuided, guidedToDraft } from './guidedDraftAdapter';
import { createGuidedFlow, type GuidedFlowInitial, type GuidedFlowState, type GuidedPhotoKind } from './guidedFlow';
import { clearUnknownDraft, loadUnknownDraft, saveUnknownDraft } from './unknownDraft';
import { GuidedReadLabelRequest, GuidedReadLabelResponse } from './unknownFlowContract';
import { requestUnknownFlow } from './unknownFlowTransport';

export function useGuidedAddSession(initial: GuidedFlowInitial, retakeKind?: GuidedPhotoKind) {
  const router = useRouter();
  const activity = useScreenActivity();
  const [state, setState] = useState<GuidedFlowState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);
  const controllerRef = useRef<ReturnType<typeof createGuidedFlow> | null>(null);
  const draftIdRef = useRef<string>(randomUUID());
  const initialRef = useRef(initial);
  const retakeRef = useRef(retakeKind);
  const runtimeRef = useRef({ router, activity });
  runtimeRef.current = { router, activity };

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const token = runtimeRef.current.activity.start();

    void loadUnknownDraft()
      .then(stored => {
        if (!active) return;
        const draftId = stored?.id ?? randomUUID();
        draftIdRef.current = draftId;
        setRestoredFromDraft(Boolean(stored));
        const flow = createGuidedFlow(
          initialRef.current,
          {
            preparePhoto: compressPhoto,
            keepPhoto,
            openPhoto,
            async identify(base64) {
              const outcome = await api.identifyOutcome(base64);
              if (outcome && typeof outcome === 'object' && 'status' in outcome && outcome.status === 'pending' && 'completion' in outcome) {
                throw new Error('interrupted');
              }
              return outcome && typeof outcome === 'object' && 'result' in outcome ? outcome.result : outcome;
            },
            readLabel: req => requestUnknownFlow('read-label', GuidedReadLabelRequest, GuidedReadLabelResponse, req),
            persist: async snapshot => {
              if (active) await saveUnknownDraft(guidedToDraft(snapshot, draftIdRef.current));
            },
            onIdentify(response, scannedCode, frontPhotoId) {
              if (!active || !runtimeRef.current.activity.isCurrent(token) || response.status === 'found') return;
              const payload = scannedCode ? { ...response, read: { ...response.read, code: scannedCode } } : response;
              const route = identifyPhotoRoute(payload);
              runtimeRef.current.router.replace({ ...route, params: { ...route.params, frontPhotoId, unknownDraftId: draftIdRef.current } });
            },
            onFound(found) {
              void completeUnknownDraft(guidedToDraft(flow.getState(), draftIdRef.current), found)
                .then(() => {
                  if (active && runtimeRef.current.activity.isCurrent(token)) {
                    runtimeRef.current.router.replace(productRoute(found.product.id));
                  }
                })
                .catch(() => {});
            },
            onReview() {
              if (active && runtimeRef.current.activity.isCurrent(token)) {
                runtimeRef.current.router.replace({ pathname: '/add/review', params: { unknownDraftId: draftIdRef.current } });
              }
            },
          },
          stored ? draftToGuided(stored) : undefined,
        );
        unsubscribe = flow.subscribe(next => {
          if (active) setState(next);
        });
        if (retakeRef.current) flow.retake(retakeRef.current);
        controllerRef.current = flow;
        setState(flow.getState());
      })
      .catch(err => {
        if (!active) return;
        controllerRef.current = null;
        setState(null);
        setError(err instanceof Error ? err.message : 'storage');
      });

    return () => {
      active = false;
      unsubscribe?.();
      controllerRef.current?.cancel();
    };
  }, []);

  const discardDraft = async () => {
    const currentId = draftIdRef.current;
    const photos = state?.photos;
    controllerRef.current?.cancel();
    await clearUnknownDraft(currentId);
    if (photos && !initialRef.current.queueId) {
      for (const id of new Set(Object.values(photos))) {
        if (id) await removePhoto(id).catch(() => {});
      }
    }
    setRestoredFromDraft(false);
  };

  return { state, controller: controllerRef.current, draftId: draftIdRef.current, error, restoredFromDraft, discardDraft };
}
