import { AddProductRequest, IdentifyRequest, IdentifyResponse } from '@okbite/shared';
import { NutritionMode, type GuidedReadLabelResponse } from './unknownFlowContract';
import { hasUnreadableNutrition, ingredientsOnly, prepareGuidedPhoto, readGuidedLabel, validateBody } from './guidedReading';
import type { GuidedFlowDependencies, GuidedFlowInitial, GuidedFlowState, GuidedPhotoKind } from './guidedFlowTypes';
export type { GuidedFlowState, GuidedFlowDependencies, GuidedFlowInitial, GuidedPhotoKind } from './guidedFlowTypes';

const identityFields = AddProductRequest.pick({ name: true, quantity: true });

export function createGuidedFlow(initial: GuidedFlowInitial, deps: GuidedFlowDependencies, restored?: GuidedFlowState) {
  let state: GuidedFlowState = {
    stage: 'identity', initial: { ...initial },
    initialFrontRead: { brand: initial.brand, name: initial.name, quantity: initial.quantity, code: initial.code },
    scannedCode: initial.code, remotePhotoPath: initial.photoPath,
    photos: { front: initial.frontPhotoId ?? null, ingredients: null, nutrition: null }, nutritionMode: null, label: null,
  };
  if (restored) state = { ...restored, stage: restored.stage === 'working' ? 'interrupted' : restored.stage };
  const listeners = new Set<(snapshot: GuidedFlowState) => void>();
  let busy = false;
  let cancelled = false;
  let lastAttempt: (() => Promise<void>) | null = null;
  let completedRead: GuidedReadLabelResponse | null = null;
  const active = () => !cancelled;
  function set(patch: Partial<GuidedFlowState>) {
    state = { ...state, ...patch };
    for (const listener of listeners) listener(state);
  }
  const persist = () => deps.persist?.(state);
  async function run(action: () => Promise<void>) {
    if (busy || cancelled) return;
    busy = true; lastAttempt = action;
    set({ stage: 'working', error: undefined });
    try { await action(); }
    catch (error) {
      if (active()) {
        const candidate = error as { code?: string; message?: string };
        set({ stage: 'error', error: candidate.code ?? candidate.message ?? 'failed' });
      }
    } finally { busy = false; }
  }
  async function confirmIdentity(name: string, quantity: string) {
    if (busy || cancelled || state.stage !== 'identity') return;
    const identity = identityFields.safeParse({ name: name.trim(), quantity: quantity.trim() });
    if (!identity.success || !identity.data.quantity) return;
    const next: GuidedFlowState = {
      ...state,
      stage: state.remotePhotoPath ? 'ingredients' : 'front',
      initial: { ...state.initial, ...identity.data, identityConfirmed: true },
      initialFrontRead: { ...state.initialFrontRead, ...identity.data },
    };
    busy = true;
    try {
      await deps.persist?.(next);
      if (active()) set(next);
    } finally { busy = false; }
  }
  async function review(manual = false) {
    set({ stage: 'review' });
    await persist();
    if (active()) deps.onReview(state, manual);
  }
  async function read() {
    await persist();
    if (!active()) return;
    const label = completedRead ?? await readGuidedLabel(state, deps, active);
    if (!label || !active()) return;
    if (Object.values(label.reasons).includes('failed')) {
      set({ label: state.label ?? label, stage: 'label_failed' });
      await persist();
      return;
    }
    completedRead = label;
    set({ label });
    if (hasUnreadableNutrition(label) && state.nutritionMode !== 'none' && state.nutritionMode !== 'skipped') {
      set({ stage: 'nutrition_unreadable' });
      await persist();
    } else await review();
  }
  async function identifyFront(base64: string) {
    const request = IdentifyRequest.parse({ photo: base64 });
    validateBody(request);
    await persist();
    if (!active()) return;
    const parsed = IdentifyResponse.safeParse(await deps.identify(request.photo));
    if (!parsed.success || !parsed.data.photoPath.trim()) throw new Error('invalid_response');
    if (!active()) return;
    const response = parsed.data;
    const read = response.status === 'found' ? state.initialFrontRead : response.read;
    const { name, quantity, identityConfirmed } = state.initial;
    const nextInitial = { ...state.initial, brand: read.brand ?? state.initial.brand,
      name: identityConfirmed ? name : read.name ?? name,
      quantity: identityConfirmed ? quantity : read.quantity ?? quantity, code: state.scannedCode ?? read.code,
      photoPath: response.photoPath, frontPhotoId: state.photos.front! };
    const returnToReview = Boolean(state.label && identityConfirmed);
    set({ initial: nextInitial, initialFrontRead: { brand: nextInitial.brand, name: nextInitial.name, quantity: nextInitial.quantity, code: nextInitial.code }, remotePhotoPath: response.photoPath,
      stage: returnToReview || (response.status === 'not_found' && state.label) ? 'review' : response.status === 'not_found' ? 'ingredients' : 'interrupted' });
    await persist();
    if (!active()) return;
    if (returnToReview) await review();
    else if (response.status === 'found') deps.onFound({ status: 'found', product: response.product, score: response.score });
    else if (response.status === 'candidates') deps.onIdentify(response, state.scannedCode, state.photos.front!);
    else if (state.label) await review();
  }
  async function capturePhoto(uri: string) {
    const kind = state.stage;
    if (kind !== 'front' && kind !== 'ingredients' && kind !== 'nutrition') return;
    let retained: { id: string; base64: string } | null = null;
    if (kind === 'nutrition' || kind === 'ingredients') completedRead = null;
    await run(async () => {
      if (!retained) {
        const photo = await prepareGuidedPhoto(deps, uri);
        if (!active()) return;
        const id = await deps.keepPhoto(photo.uri);
        if (!active()) return;
        if (!id.trim()) throw new Error('invalid_photo');
        retained = { id, base64: photo.base64 };
      }
      set({ photos: { ...state.photos, [kind]: retained.id } });
      await persist();
      if (!active()) return;
      if (kind === 'front') await identifyFront(retained.base64);
      else if (kind === 'ingredients' && (!state.nutritionMode || !state.label)) { set({ stage: 'nutrition_question' }); await persist(); }
      else await read();
    });
  }
  return {
    getState: () => state,
    subscribe(listener: (snapshot: GuidedFlowState) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    confirmIdentity,
    capturePhoto,
    async enterLabelManually() {
      if (busy || cancelled || state.stage !== 'label_failed' || !state.label) return;
      await run(() => review(true));
    },
    async chooseNutrition(mode: NutritionMode) {
      if (state.stage !== 'nutrition_question' || busy || cancelled) return;
      const parsed = NutritionMode.safeParse(mode);
      if (!parsed.success) return;
      completedRead = null;
      if (mode === 'separate') { set({ nutritionMode: mode, stage: 'nutrition' }); await persist(); }
      else await run(async () => { set({ nutritionMode: mode }); await read(); });
    },
    async continueIngredientsOnly() {
      if (state.stage !== 'nutrition_unreadable' || !state.label) return;
      await run(async () => {
        completedRead = ingredientsOnly(state.label!);
        set({ label: completedRead, nutritionMode: 'skipped' });
        await review();
      });
    },
    retake(kind: GuidedPhotoKind) {
      if (busy || cancelled) return;
      completedRead = null;
      set({ stage: kind, error: undefined, ...(kind === 'nutrition' ? { nutritionMode: 'separate' as const } : {}) });
    },
    async retry() {
      if (cancelled || busy) return;
      if (state.stage === 'label_failed') { await run(read); return; }
      if (state.stage === 'error' && lastAttempt) { await run(lastAttempt); return; }
      if (state.stage !== 'interrupted' && state.stage !== 'error') return;
      if (!state.remotePhotoPath && state.photos.front) {
        await run(async () => {
          const photo = await deps.openPhoto(state.photos.front!);
          try { await identifyFront((await prepareGuidedPhoto(deps, photo.uri)).base64); }
          finally { photo.release(); }
        });
      } else if (state.photos.ingredients && state.nutritionMode && (state.nutritionMode !== 'separate' || state.photos.nutrition)) await run(read);
      else set({ stage: !state.remotePhotoPath ? 'front' : !state.photos.ingredients ? 'ingredients' : state.nutritionMode === 'separate' ? 'nutrition' : 'nutrition_question' });
    },
    cancel() { cancelled = true; set({ stage: 'interrupted' }); },
  };
}
