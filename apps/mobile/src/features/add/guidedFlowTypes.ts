import type { FrontRead, IdentifyResponse, LookupResponse } from '@okbite/shared';
import type { AddInitialValues } from '../identify/routes';
import type { GuidedReadLabelRequest, GuidedReadLabelResponse, NutritionMode } from './unknownFlowContract';

export type GuidedPhotoKind = 'front' | 'ingredients' | 'nutrition';
export type GuidedFlowInitial = AddInitialValues & { frontPhotoId?: string };
export interface GuidedFlowState {
  stage: 'front' | 'ingredients' | 'nutrition_question' | 'nutrition' | 'nutrition_unreadable' | 'review' | 'working' | 'error' | 'interrupted';
  initial: GuidedFlowInitial;
  initialFrontRead: FrontRead;
  scannedCode: string | null;
  remotePhotoPath: string | null;
  photos: Record<GuidedPhotoKind, string | null>;
  nutritionMode: NutritionMode | null;
  label: GuidedReadLabelResponse | null;
  error?: string;
}
export interface GuidedFlowDependencies {
  preparePhoto(uri: string, maxBytes: number): Promise<{ uri: string; base64: string; bytes: number }>;
  keepPhoto(uri: string): Promise<string>;
  openPhoto(id: string): Promise<{ uri: string; release(): void }>;
  identify(base64: string): Promise<unknown>;
  readLabel(request: GuidedReadLabelRequest): Promise<unknown>;
  onIdentify(response: IdentifyResponse, scannedCode: string | null, frontPhotoId: string): void;
  onFound(found: Extract<LookupResponse, { status: 'found' }>): void;
  onReview(snapshot: GuidedFlowState): void;
  persist?(snapshot: GuidedFlowState): Promise<void>;
}
