import rawCategories from '../../../../../data/categories.json';
import {
  CategoryEntry,
  LookupResponse,
  ReadLabelResponse,
  type Category as CategoryType,
  type ReadLabelResponse as ReadLabelResponseType,
} from '@okbite/shared';
import type { AddInitialValues } from '../identify/routes';

export interface AddReviewDraft {
  initial: AddInitialValues;
  label: ReadLabelResponseType;
  savedResult?: Extract<LookupResponse, { status: 'found' }> | null;
  completionId?: string;
}

function parseUniqueCategories(entries: readonly unknown[]): readonly CategoryType[] {
  const seen = new Set<string>();
  const valid: CategoryType[] = [];
  for (const item of entries) {
    const parsed = CategoryEntry.safeParse(item);
    if (!parsed.success) continue;
    const slug = parsed.data.slug.trim();
    const name = parsed.data.name.trim();
    if (!slug || !name || seen.has(slug)) continue;
    seen.add(slug);
    valid.push({ ...parsed.data, slug, name });
  }
  return valid;
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

export function setAddReviewDraftResult(
  result: Extract<LookupResponse, { status: 'found' }>,
  targetDraft?: AddReviewDraft | null,
): void {
  if (currentDraft && (!targetDraft || currentDraft === targetDraft)) {
    currentDraft.savedResult = result;
  }
}

export function clearAddReviewDraft(): void {
  currentDraft = null;
}

export function setAvailableCategories(categories: readonly unknown[]): void {
  availableCategories = parseUniqueCategories(categories);
}

export function initializeAvailableCategories(): readonly CategoryType[] {
  setAvailableCategories(Array.isArray(rawCategories) ? rawCategories : []);
  return availableCategories;
}

export function getAvailableCategories(): readonly CategoryType[] {
  return availableCategories;
}

export function resetAvailableCategories(): void {
  initializeAvailableCategories();
}

initializeAvailableCategories();
