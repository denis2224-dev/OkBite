import {
  Category,
  ReadLabelResponse,
  type Category as CategoryType,
  type ReadLabelResponse as ReadLabelResponseType,
} from '@okbite/shared';
import { parseAddParams, type AddInitialValues } from '../identify/routes';

export interface AddReviewDraft {
  initial: AddInitialValues;
  label: ReadLabelResponseType;
}

let currentDraft: AddReviewDraft | null = null;
let availableCategories: readonly CategoryType[] = [];
let retakeIdentity: AddInitialValues | null = null;

function isValidDraft(draft: AddReviewDraft | null): draft is AddReviewDraft {
  if (!draft) return false;
  const parsed = ReadLabelResponse.safeParse(draft.label);
  if (!parsed.success) return false;
  if (!parsed.data.ingredientsPhotoPath.trim()) return false;
  if (
    parsed.data.nutritionPhotoPath !== null &&
    !parsed.data.nutritionPhotoPath.trim()
  ) {
    return false;
  }
  return true;
}

export function setAddReviewDraft(draft: AddReviewDraft): void {
  currentDraft = isValidDraft(draft) ? draft : null;
  if (currentDraft) {
    retakeIdentity = null;
  }
}

export function getAddReviewDraft(): AddReviewDraft | null {
  return isValidDraft(currentDraft) ? currentDraft : null;
}

export function setAvailableCategories(categories: readonly CategoryType[]): void {
  const valid: CategoryType[] = [];
  for (const item of categories) {
    const parsed = Category.safeParse(item);
    if (parsed.success) valid.push(parsed.data);
  }
  availableCategories = valid;
}

export function getAvailableCategories(): readonly CategoryType[] {
  return availableCategories;
}

export function beginRetakeWithIdentity(identity: AddInitialValues): void {
  currentDraft = null;
  retakeIdentity = identity;
}

export function resolveAddInitialValues(
  rawParams: Record<string, string | string[] | undefined>,
): AddInitialValues {
  if (retakeIdentity) {
    return retakeIdentity;
  }
  return parseAddParams(rawParams);
}

export function clearAddReviewDraft(): void {
  currentDraft = null;
  availableCategories = [];
  retakeIdentity = null;
}
