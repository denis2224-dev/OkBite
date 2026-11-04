import {
  Category,
  ReadLabelResponse,
  type Category as CategoryType,
  type ReadLabelResponse as ReadLabelResponseType,
} from '@okbite/shared';
import type { AddInitialValues } from '../identify/routes';

export interface AddReviewDraft {
  initial: AddInitialValues;
  label: ReadLabelResponseType;
}

let currentDraft: AddReviewDraft | null = null;
let availableCategories: readonly CategoryType[] = [];

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
}

export function getAddReviewDraft(): AddReviewDraft | null {
  return isValidDraft(currentDraft) ? currentDraft : null;
}

export function clearAddReviewDraft(): void {
  currentDraft = null;
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

export function resetAvailableCategories(): void {
  availableCategories = [];
}
