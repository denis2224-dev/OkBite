import {
  askClaude,
  PreProviderError,
  toBase64,
  UpstreamError,
  validateProviderImages,
} from '../_lib/claude.ts';
import { adminClient } from '../_lib/http.ts';
import { releaseUsage, reserveUsage } from '../_lib/quota.ts';
import { saveJpeg } from '../_lib/storage.ts';
import { emptyRead, type LabelAsk, type LabelRead, parseLabel } from './parseLabel.ts';
import { labelPrompt } from './prompt.ts';
import {
  type EnrichReadLabelRequest,
  EnrichReadLabelResponse,
  type NutritionMode,
  type ReadLabelRequest,
  ReadLabelResponse,
} from '../_shared/contract.ts';

// No mode = an old client: a null nutritionImage meant "both on one photo".
const nutritionMode = (r: ReadLabelRequest | EnrichReadLabelRequest): NutritionMode =>
  r.nutrition ?? (r.nutritionImage === null ? 'same_photo' : 'separate');

export function createService(deps = { adminClient, saveJpeg, askClaude }) {
  return async (input: ReadLabelRequest | EnrichReadLabelRequest, device: string) => {
    const db = deps.adminClient();
    const event = await reserveUsage(db, device, 'read_label'); // 20 per device per 24 h (C6 migration)
    const saved: string[] = [];
    let ingredientsPath: string | null = null;
    let nutritionPath: string | null = null;
    let providerStarted = false;
    const ask: LabelAsk = {
      ingredients: input.ingredientsImage !== null,
      nutrition: nutritionMode(input),
    };
    try {
      if (input.ingredientsImage !== null) {
        saved.push(
          ingredientsPath = await deps.saveJpeg(input.ingredientsImage, device, 'ingredients'),
        );
      }
      if (input.nutritionImage !== null) {
        saved.push(nutritionPath = await deps.saveJpeg(input.nutritionImage, device, 'nutrition'));
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
        read = parseLabel(await deps.askClaude(images, labelPrompt(ask)), ask);
      } catch (error) {
        if (error instanceof PreProviderError || !(error instanceof UpstreamError)) throw error;
        // Provider error, timeout or unusable answer: photos are kept and the shopper types it in (#104).
        console.warn('Label not read by the AI; the shopper fills it in by hand');
        read = emptyRead(ask, true);
      }
      return (ask.ingredients ? ReadLabelResponse : EnrichReadLabelResponse).parse({
        ...read,
        ingredientsPhotoPath: ingredientsPath,
        nutritionPhotoPath: nutritionPath,
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
