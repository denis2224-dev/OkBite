import type { GuidedFlowState } from './guidedFlowTypes';
import { GuidedReadLabelResponse } from './unknownFlowContract';
import { UnknownDraftSnapshotSchema, type UnknownDraftSnapshot } from './unknownDraft';

export function guidedToDraft(state: GuidedFlowState, id: string): UnknownDraftSnapshot {
  const pending = state.stage === 'working';
  const failed = state.stage === 'error' || state.stage === 'interrupted';
  const stage = pending || failed ? 'reading' : state.stage === 'nutrition_unreadable' ? 'review' : state.stage;
  return UnknownDraftSnapshotSchema.parse({
    version: 1, id, initial: state.initial, stage,
    nutritionMode: state.nutritionMode, photos: state.photos, label: state.label,
    readStatus: pending ? 'pending' : failed ? 'interrupted' : state.label ? 'complete' : 'idle',
  });
}

export function draftToGuided(snapshot: UnknownDraftSnapshot): GuidedFlowState {
  const parsed = snapshot.label ? GuidedReadLabelResponse.safeParse(snapshot.label) : null;
  const interrupted = snapshot.readStatus === 'pending' || snapshot.readStatus === 'interrupted';
  const stage = interrupted ? 'interrupted' : snapshot.stage === 'reading' ? 'interrupted' : snapshot.stage;
  return {
    stage, initial: snapshot.initial,
    initialFrontRead: { code: snapshot.initial.code, name: snapshot.initial.name, brand: snapshot.initial.brand, quantity: snapshot.initial.quantity },
    scannedCode: snapshot.initial.code, remotePhotoPath: snapshot.initial.photoPath,
    photos: snapshot.photos, nutritionMode: snapshot.nutritionMode,
    label: parsed?.success ? parsed.data : null,
  };
}
