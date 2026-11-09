import { NUTRIENT_KEYS, type ReadLabelRequest, ReadLabelResponse } from '../_shared/contract.ts';
import { askClaude, PreProviderError, toBase64, UpstreamError, validateProviderImages } from '../_lib/claude.ts';
import { adminClient } from '../_lib/http.ts';
import { releaseUsage, reserveUsage } from '../_lib/quota.ts';
import { saveJpeg } from '../_lib/storage.ts';
import { type LabelRead, parseLabel } from './parseLabel.ts';
import { LABEL_PROMPT } from './prompt.ts';

// The AI could not read the label: the photos are kept and every field goes to the shopper to type in.
const UNREAD: LabelRead = {
  ingredientsText: null,
  unit: null,
  nutrients: Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, null])) as LabelRead['nutrients'],
  unclear: [...NUTRIENT_KEYS, 'ingredientsText'],
};

export function createService(deps = { adminClient, saveJpeg, askClaude }) {
  return async (input: ReadLabelRequest, device: string) => {
    const db = deps.adminClient();
    const event = await reserveUsage(db, device, 'read_label'); // 20 per device per 24 h (C6 migration)
    const saved: string[] = [];
    let providerStarted = false;
    try {
      saved.push(await deps.saveJpeg(input.ingredientsImage, device, 'ingredients'));
      if (input.nutritionImage !== null) {
        saved.push(await deps.saveJpeg(input.nutritionImage, device, 'nutrition'));
      }
      // Use the stored copies, which saveJpeg re-encoded without EXIF/GPS metadata.
      const images = await Promise.all(saved.map(async (path) => {
        const stored = await db.storage.from('uploads').download(path);
        if (stored.error) throw new Error('Private photo read failed');
        return toBase64(new Uint8Array(await stored.data.arrayBuffer()));
      }));
      validateProviderImages(images);
      providerStarted = true;
      let read: LabelRead;
      try {
        read = parseLabel(await deps.askClaude(images, LABEL_PROMPT));
      } catch (error) {
        if (error instanceof PreProviderError || !(error instanceof UpstreamError)) throw error;
        console.warn('Label not read by the AI; the shopper fills it in by hand');
        read = UNREAD;
      }
      return ReadLabelResponse.parse({
        ...read,
        ingredientsPhotoPath: saved[0],
        nutritionPhotoPath: saved[1] ?? null,
      });
    } catch (error) {
      // Failed requests return no reusable paths. Keep admission on uncertain/billed attempts.
      try {
        if (saved.length) {
          const { error } = await db.storage.from('uploads').remove(saved);
          if (error) throw new Error('Private photo cleanup failed');
        }
      } finally {
        if (!providerStarted || error instanceof PreProviderError) await releaseUsage(db, event);
      }
      throw error;
    }
  };
}
export const readLabel = createService();
