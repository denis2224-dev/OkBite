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
  const [controller, setController] = useState<ReturnType<typeof createGuidedFlow> | null>(null);
  const [draftId, setDraftId] = useState<string>(() => randomUUID());
  const [error, setError] = useState<string | null>(null);
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);
  const [draftConflict, setDraftConflict] = useState(false);
  const [discardError, setDiscardError] = useState(false);
  const [sessionVersion, setSessionVersion] = useState(0);
  const draftIdRef = useRef<string>(draftId);
  const initialRef = useRef(initial);
  const retakeRef = useRef(retakeKind);
  const runtimeRef = useRef({ router, activity });

  useEffect(() => {
    runtimeRef.current = { router, activity };
  });

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    let activeFlow: ReturnType<typeof createGuidedFlow> | null = null;

    void loadUnknownDraft()
      .then(stored => {
        if (!active) return;
        let token = runtimeRef.current.activity.start();
        const runFocused = async (action: () => Promise<void>) => {
          if (flow.getState().stage === 'working') return;
          token = runtimeRef.current.activity.start();
          await action();
        };
        const nextDraftId = stored?.id ?? randomUUID();
        draftIdRef.current = nextDraftId;
        setDraftId(nextDraftId);
        setRestoredFromDraft(Boolean(stored));
        const incoming = initialRef.current;
        const conflict = Boolean(stored && (incoming.unknownDraftId
          ? incoming.unknownDraftId !== stored.id
          : (incoming.code && incoming.code !== stored.initial.code) ||
            (incoming.photoPath && incoming.photoPath !== stored.initial.photoPath)));
        setDraftConflict(conflict);
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
            onReview(_snapshot, manual) {
              if (active && runtimeRef.current.activity.isCurrent(token)) {
                runtimeRef.current.router.replace({ pathname: '/add/review', params: { unknownDraftId: draftIdRef.current, ...(manual ? { manual: '1' } : {}) } });
              }
            },
          },
          stored ? draftToGuided(stored) : undefined,
        );
        activeFlow = flow;
        unsubscribe = flow.subscribe(next => {
          if (active) setState(next);
        });
        if (retakeRef.current && !conflict) flow.retake(retakeRef.current);
        setController({ ...flow,
          capturePhoto: uri => runFocused(() => flow.capturePhoto(uri)),
          chooseNutrition: mode => runFocused(() => flow.chooseNutrition(mode)),
          continueIngredientsOnly: () => runFocused(flow.continueIngredientsOnly),
          enterLabelManually: () => runFocused(flow.enterLabelManually),
          retry: () => runFocused(flow.retry),
        });
        setState(flow.getState());
      })
      .catch(err => {
        if (!active) return;
        setController(null);
        setState(null);
        setError(err instanceof Error ? err.message : 'storage');
      });

    return () => {
      active = false;
      unsubscribe?.();
      activeFlow?.cancel();
    };
  }, [sessionVersion]);

  const discardDraft = async () => {
    const currentId = draftIdRef.current;
    const photos = state?.photos;
    try { await clearUnknownDraft(currentId); }
    catch { setDiscardError(true); return; }
    controller?.cancel();
    if (photos && !initialRef.current.queueId) {
      for (const id of new Set(Object.values(photos))) {
        if (id) await removePhoto(id).catch(() => {});
      }
    }
    setRestoredFromDraft(false);
    setDraftConflict(false);
    setDiscardError(false);
    retakeRef.current = undefined;
    setState(null);
    setController(null);
    setSessionVersion(version => version + 1);
  };

  return { state, controller, draftId, error, restoredFromDraft, draftConflict, discardError,
    resumeDraft: () => setDraftConflict(false), discardDraft };
}
