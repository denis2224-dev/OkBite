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
import { GuidedReadLabelRequest, GuidedReadLabelResponse, type NutritionMode } from './unknownFlowContract';
import { requestUnknownFlow } from './unknownFlowTransport';
import { clearIdentifyDraft } from './draftStore';

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
  const [frontPending, setFrontPending] = useState<'none' | 'waiting' | 'retry'>('none');
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
        setFrontPending('none');
        let token = runtimeRef.current.activity.start();
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
        const isSessionActive = () => active && draftIdRef.current === nextDraftId;
        const hasNewerDraft = async () => {
          const currentDraft = await loadUnknownDraft().catch(() => null);
          return Boolean(currentDraft && currentDraft.id !== nextDraftId);
        };
        let flowCancelledByBlur = false;
        let abandonedFrontIdentify = false;
        let flowInstance!: ReturnType<typeof createGuidedFlow>;
        const bindFlow = (restoredState?: GuidedFlowState) => {
          unsubscribe?.();
          let abandoned = false;
          const nextFlow = createGuidedFlow(
            initialRef.current,
            {
              preparePhoto: compressPhoto,
              keepPhoto,
              openPhoto,
              async identify(base64) {
                const requestToken = token;
                const isCurrentRequest = () => isSessionActive() && runtimeRef.current.activity.isCurrent(requestToken);
                const abandonIfStale = async () => {
                  if (isCurrentRequest() && !(await hasNewerDraft())) return false;
                  abandoned = true;
                  if (isSessionActive()) {
                    flowCancelledByBlur = true;
                    abandonedFrontIdentify = true;
                    setFrontPending('none');
                  }
                  nextFlow.cancel();
                  return true;
                };
                if (await abandonIfStale()) return null;
                let pending = false;
                try {
                  const outcome = await api.identifyOutcome(base64);
                  pending = Boolean(outcome && typeof outcome === 'object' && 'status' in outcome && outcome.status === 'pending' && 'completion' in outcome);
                  if (pending && isCurrentRequest()) setFrontPending('waiting');
                  const result = pending
                    ? await (outcome as { completion: Promise<unknown> }).completion
                    : (outcome && typeof outcome === 'object' && 'result' in outcome ? outcome.result : outcome);
                  if (await abandonIfStale()) return null;
                  if (pending) setFrontPending('none');
                  return result;
                } catch (err) {
                  if (await abandonIfStale()) return null;
                  if (pending) setFrontPending('retry');
                  throw err;
                }
              },
              readLabel: req => requestUnknownFlow('read-label', GuidedReadLabelRequest, GuidedReadLabelResponse, req),
              persist: async snapshot => {
                if (!isSessionActive() || abandoned || await hasNewerDraft()) return;
                await saveUnknownDraft(guidedToDraft(snapshot, nextDraftId));
              },
              onIdentify(response, scannedCode, frontPhotoId) {
                if (!isSessionActive() || !runtimeRef.current.activity.isCurrent(token) || response.status === 'found') return;
                const payload = scannedCode ? { ...response, read: { ...response.read, code: scannedCode } } : response;
                const route = identifyPhotoRoute(payload, frontPhotoId, nextDraftId);
                runtimeRef.current.router.replace(route);
              },
              onFound(found) {
                const requestToken = token;
                if (!isSessionActive() || !runtimeRef.current.activity.isCurrent(requestToken)) return;
                void hasNewerDraft()
                  .then(stale => {
                    if (stale || !isSessionActive() || !runtimeRef.current.activity.isCurrent(requestToken)) return;
                    return completeUnknownDraft(guidedToDraft(nextFlow.getState(), nextDraftId), found)
                      .then(() => {
                        if (isSessionActive() && runtimeRef.current.activity.isCurrent(requestToken)) {
                          runtimeRef.current.router.replace(productRoute(found.product.id));
                        }
                      });
                  })
                  .catch(() => {});
              },
              onReview(_snapshot, manual) {
                if (isSessionActive() && runtimeRef.current.activity.isCurrent(token)) {
                  runtimeRef.current.router.replace({ pathname: '/add/review', params: { unknownDraftId: nextDraftId, ...(manual ? { manual: '1' } : {}) } });
                }
              },
            },
            restoredState,
          );
          flowInstance = nextFlow;
          activeFlow = nextFlow;
          unsubscribe = nextFlow.subscribe(next => {
            if (!active || activeFlow !== nextFlow) return;
            setState(next);
            if (next.stage !== 'working' && next.stage !== 'error') setFrontPending('none');
          });
          return nextFlow;
        };
        const flow = bindFlow(stored ? draftToGuided(stored) : undefined);
        const ensureActiveFlow = () => {
          if (!flowCancelledByBlur || !isSessionActive()) return flowInstance;
          const clearRemoteFront = abandonedFrontIdentify;
          flowCancelledByBlur = false;
          abandonedFrontIdentify = false;
          const snapshot = flowInstance.getState();
          return bindFlow({
            ...snapshot,
            remotePhotoPath: clearRemoteFront ? null : snapshot.remotePhotoPath,
            error: undefined,
          });
        };
        const runFocused = async (action: (target: ReturnType<typeof createGuidedFlow>) => Promise<void>) => {
          const target = ensureActiveFlow();
          if (target.getState().stage === 'working') return;
          setFrontPending('none');
          token = runtimeRef.current.activity.start();
          await action(target);
        };
        if (retakeRef.current && !conflict) flow.retake(retakeRef.current);
        setController({
          getState: () => flowInstance.getState(),
          subscribe: listener => flowInstance.subscribe(listener),
          capturePhoto: uri => runFocused(target => target.capturePhoto(uri)),
          chooseNutrition: (mode: NutritionMode) => runFocused(target => target.chooseNutrition(mode)),
          continueIngredientsOnly: () => runFocused(target => target.continueIngredientsOnly()),
          enterLabelManually: () => runFocused(target => target.enterLabelManually()),
          retake: kind => ensureActiveFlow().retake(kind),
          retry: () => runFocused(target => target.retry()),
          cancel: () => flowInstance.cancel(),
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
    clearIdentifyDraft(currentId);
    controller?.cancel();
    if (photos && !initialRef.current.queueId) {
      for (const id of new Set(Object.values(photos))) {
        if (id) await removePhoto(id).catch(() => {});
      }
    }
    setRestoredFromDraft(false);
    setDraftConflict(false);
    setDiscardError(false);
    setFrontPending('none');
    retakeRef.current = undefined;
    setState(null);
    setController(null);
    setSessionVersion(version => version + 1);
  };

  return { state, controller, draftId, error, restoredFromDraft, draftConflict, discardError, frontPending,
    resumeDraft: () => setDraftConflict(false), discardDraft };
}
