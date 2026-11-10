import { NUTRIENT_KEYS } from '@okbite/shared';
import { GuidedReadLabelRequest, GuidedReadLabelResponse, type FieldReason } from './unknownFlowContract';
import type { GuidedFlowDependencies, GuidedFlowState } from './guidedFlowTypes';

const SINGLE_BUDGET = 1_450_000;
const PAIR_BUDGET = 700_000;
export function validateBody(value: unknown): void {
  const body = JSON.stringify(value);
  const bytes = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(body).length : encodeURIComponent(body).replace(/%[A-F\d]{2}/g, 'U').length;
  if (bytes > 2_000_000) throw new Error('bad_request');
}
export async function prepareGuidedPhoto(deps: GuidedFlowDependencies, uri: string, budget = SINGLE_BUDGET) {
  const photo = await deps.preparePhoto(uri, budget);
  if (!photo.base64 || !Number.isFinite(photo.bytes) || photo.bytes < 1 || photo.bytes > budget) throw new Error('bad_request');
  return photo;
}
export async function readGuidedLabel(state: GuidedFlowState, deps: GuidedFlowDependencies, active: () => boolean) {
  const mode = state.nutritionMode;
  if (!mode || !state.photos.ingredients) throw new Error('bad_request');
  const budget = mode === 'separate' ? PAIR_BUDGET : SINGLE_BUDGET;
  async function read(id: string) {
    const photo = await deps.openPhoto(id);
    try { return (await prepareGuidedPhoto(deps, photo.uri, budget)).base64; }
    finally { photo.release(); }
  }
  const ingredientsImage = await read(state.photos.ingredients);
  const nutritionImage = mode === 'separate' && state.photos.nutrition ? await read(state.photos.nutrition) : null;
  const request = GuidedReadLabelRequest.parse({ ingredientsImage, nutritionImage, nutrition: mode });
  validateBody(request);
  if (!active()) return null;
  const response = GuidedReadLabelResponse.safeParse(await deps.readLabel(request));
  if (!response.success) throw new Error('invalid_response');
  return mode === 'none' || mode === 'skipped' ? ingredientsOnly(response.data, mode === 'none' ? 'not_printed' : 'not_photographed') : response.data;
}
export function ingredientsOnly(label: GuidedReadLabelResponse, reason: FieldReason = 'not_photographed'): GuidedReadLabelResponse {
  return { ...label, nutrients: { kcal: null, fat: null, sat: null, sugar: null, salt: null, protein: null, fiber: null, fruitVegPct: null },
    reasons: { ...label.reasons, ...Object.fromEntries(NUTRIENT_KEYS.map(key => [key, reason])) },
    unclear: label.unclear.filter(key => key === 'ingredientsText') };
}
export function hasUnreadableNutrition(label: GuidedReadLabelResponse) {
  const anyRead = NUTRIENT_KEYS.some(key => label.nutrients[key] !== null);
  return !anyRead && NUTRIENT_KEYS.some(key => ['unreadable', 'no_per_100', 'failed'].includes(label.reasons[key] ?? ''));
}
