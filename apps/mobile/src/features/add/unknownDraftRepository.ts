import { z } from 'zod';
import { FrontRead, LookupResponse, ReadLabelResponse } from '@okbite/shared';

// These are keepPhoto IDs (file paths on native, IndexedDB keys on web), never display URIs.
const photoReference = z.string().min(1).refine(value => !/^(blob:|data:)/i.test(value));
export const UnknownDraftSnapshotSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  initial: FrontRead.extend({
    photoPath: photoReference.nullable(),
    queueId: z.string().min(1).optional(),
    frontPhotoId: photoReference.optional(),
    categorySlug: z.string().min(1).optional(),
  }),
  stage: z.enum(['front', 'ingredients', 'nutrition_question', 'nutrition', 'reading', 'review']),
  nutritionMode: z.enum(['separate', 'same_photo', 'none', 'skipped']).nullable(),
  photos: z.object({
    front: photoReference.nullable(),
    ingredients: photoReference.nullable(),
    nutrition: photoReference.nullable(),
  }),
  label: ReadLabelResponse.innerType().passthrough().nullable(),
  readStatus: z.enum(['idle', 'pending', 'interrupted', 'complete']),
  savedResult: LookupResponse.options[0].nullable().optional(),
});
export type UnknownDraftSnapshot = z.infer<typeof UnknownDraftSnapshotSchema>;

export interface UnknownDraftStorage {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  remove(): Promise<void>;
}

function decode(raw: string | null): UnknownDraftSnapshot | null {
  if (raw === null) return null;
  try {
    const parsed = UnknownDraftSnapshotSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}

export function createUnknownDraftRepository(storage: UnknownDraftStorage) {
  let pending: Promise<unknown> = Promise.resolve();
  function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = pending.then(operation);
    pending = result.catch(() => {});
    return result;
  }
  return {
    loadUnknownDraft(): Promise<UnknownDraftSnapshot | null> {
      return serialize(async () => {
        const snapshot = decode(await storage.read());
        // Loading never replays uploads or calls the API. Retry requires a user action.
        return snapshot?.readStatus === 'pending'
          ? { ...snapshot, readStatus: 'interrupted' } : snapshot;
      });
    },
    async saveUnknownDraft(snapshot: UnknownDraftSnapshot): Promise<void> {
      const json = JSON.stringify(UnknownDraftSnapshotSchema.parse(snapshot));
      await serialize(() => storage.write(json));
    },
    async saveUnknownDraftIfCurrent(snapshot: UnknownDraftSnapshot): Promise<boolean> {
      const json = JSON.stringify(UnknownDraftSnapshotSchema.parse(snapshot));
      const id = snapshot.id;
      return serialize(async () => {
        if (decode(await storage.read())?.id !== id) return false;
        await storage.write(json);
        return true;
      });
    },
    clearUnknownDraft(id: string): Promise<void> {
      return serialize(async () => {
        if (decode(await storage.read())?.id === id) await storage.remove();
      });
    },
  };
}
