import {
  ReadLabelResponse,
  type Category,
  type ReadLabelResponse as ReadLabelResponseType,
} from '@okbite/shared';
import type { AddInitialValues } from '../identify/routes';

export interface AddReviewDraft {
  initial: AddInitialValues;
  label: ReadLabelResponseType;
  categories?: readonly Category[];
}

let currentDraft: AddReviewDraft | null = null;

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

