import { type ReadLabelRequest, ReadLabelResponse } from '../_shared/contract.ts';
import { askClaude, toBase64 } from '../_lib/claude.ts';
import { adminClient } from '../_lib/http.ts';
import { releaseUsage, reserveUsage } from '../_lib/quota.ts';
import { saveJpeg } from '../_lib/storage.ts';
import { parseLabel } from './parseLabel.ts';
import { LABEL_PROMPT } from './prompt.ts';

export function createService(deps = { adminClient, saveJpeg, askClaude }) {
  return async (input: ReadLabelRequest, device: string) => {
    const db = deps.adminClient();
    const event = await reserveUsage(db, device, 'read_label'); // 20 per device per 24 h (C6 migration)
    const saved: string[] = [];
    try {
      saved.push(await deps.saveJpeg(input.ingredientsImage, device, 'ingredients'));
      if (input.nutritionImage !== null) {
        saved.push(await deps.saveJpeg(input.nutritionImage, device, 'nutrition'));
      }
    } catch (error) {
      // Nothing reached Claude: undo the upload and the quota use.
      if (saved.length) await db.storage.from('uploads').remove(saved);
      await releaseUsage(db, event).catch(() => console.warn('Quota release failed'));
      throw error;
    }
    // Claude gets the stored copies, which saveJpeg re-encoded without EXIF/GPS metadata.
    const images = await Promise.all(saved.map(async (path) => {
      const stored = await db.storage.from('uploads').download(path);
      if (stored.error) throw new Error('Private photo read failed');
      return toBase64(new Uint8Array(await stored.data.arrayBuffer()));
    }));
    const read = parseLabel(await deps.askClaude(images, LABEL_PROMPT));
    return ReadLabelResponse.parse({
      ...read,
      ingredientsPhotoPath: saved[0],
      nutritionPhotoPath: saved[1] ?? null,
    });
  };
}
export const readLabel = createService();
