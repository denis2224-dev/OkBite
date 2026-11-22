import { z } from 'npm:zod@3.23.8';
import {
  type Candidate,
  Carbonation,
  type FrontRead,
  type IdentifyRequest,
  IdentifyResponse,
  Uuid,
} from '../_shared/contract.ts';
import { askClaude, PreProviderError, toBase64, validateProviderImages } from '../_lib/claude.ts';
import { loadProduct } from '../_lib/db.ts';
import { adminClient, logEvent } from '../_lib/http.ts';
import { releaseUsage, reserveUsage } from '../_lib/quota.ts';
import { saveJpeg } from '../_lib/storage.ts';
import { photoUrl } from '../_lib/photoUrl.ts';
import { parseFront } from './parseFront.ts';
import { dedupeCandidates, groupKey } from './dedupe.ts';
import { FRONT_PROMPT } from './prompt.ts';

type Db = ReturnType<typeof adminClient>;
const searchRow = z.object({
  id: Uuid,
  name: z.string(),
  brand: z.string(),
  quantity: z.string(),
  image_path: z.string().nullable(),
  similarity: z.number(),
});

const waterMetaRow = z.object({
  id: Uuid,
  name: z.string(),
  brand: z.string(),
  quantity: z.string(),
  image_path: z.string().nullable(),
  category_slug: z.string().optional(),
  water: z.object({ carbonation: Carbonation.nullable().optional() }).passthrough().nullable().optional(),
});

type CandidateRow = z.infer<typeof searchRow> & {
  carbonation?: z.infer<typeof Carbonation> | null;
  categorySlug?: string;
};

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const LINE_QUALIFIERS = ['kids', 'sport', 'iodat', 'cristalina', 'no 4', 'no 17', 'no 8'] as const;

function lineQualifiers(name: string | null | undefined): string[] {
  if (!name) return [];
  const normalized = fold(name).replace(/\./g, ' ').replace(/\bnr\s*(\d+)/g, 'no $1').replace(/\s+/g, ' ');
  return LINE_QUALIFIERS.filter((q) => normalized.includes(q));
}

function conflictsOnWaterLine(read: FrontRead, rowName: string): boolean {
  const readQuals = lineQualifiers(read.name);
  if (!readQuals.length) return false;
  const rowQuals = lineQualifiers(rowName);
  return readQuals.length !== rowQuals.length || readQuals.some(q => !rowQuals.includes(q));
}

async function waterSiblingsAndMeta(db: Db, rows: z.infer<typeof searchRow>[]) {
  if (!rows.length) return new Map<string, z.infer<typeof waterMetaRow>>();
  const brands = [...new Set(rows.map((r) => r.brand).filter(Boolean))];
  const metaMap = new Map<string, z.infer<typeof waterMetaRow>>();
  if (!brands.length) return metaMap;
  const { data, error } = await db
    .from('products')
    .select('id,name,brand,quantity,image_path,category_slug,water')
    .in('brand', brands)
    .neq('status', 'hidden')
    .limit(50);
  if (error) throw new Error('Product search failed');
  for (const r of z.array(waterMetaRow).parse(data)) {
    metaMap.set(r.id, r);
  }
  return metaMap;
}

/** Up to 3 trigram matches (C2 search_products) filtered for water variants and size safety. */
async function findCandidates(db: Db, read: FrontRead): Promise<Candidate[]> {
  const q = [read.brand, read.name].filter(Boolean).join(' ');
  if (!q) return [];
  const { data, error } = await db.rpc('search_products', { q, max_results: 3 });
  if (error) throw new Error('Product search failed');
  const rawRows = z.array(searchRow).parse(data);
  const metaById = (read.isWater || read.quantity) ? await waterSiblingsAndMeta(db, rawRows) : new Map();

  const enrich = (r: z.infer<typeof searchRow>): CandidateRow => {
    const m = metaById.get(r.id);
    return {
      ...r,
      carbonation: m?.water?.carbonation ?? null,
      categorySlug: m?.category_slug,
    };
  };

  const rows: CandidateRow[] = rawRows.map(enrich).filter((r) => !read.isWater || !conflictsOnWaterLine(read, r.name));
  const simByGroup = new Map<string, number>();
  for (const r of rows) {
    simByGroup.set(groupKey(r), r.similarity);
  }

  const siblings: CandidateRow[] = [];
  for (const m of metaById.values()) {
    const carb = m.water?.carbonation ?? null;
    if (read.isWater && conflictsOnWaterLine(read, m.name)) continue;
    const baseSim = simByGroup.get(groupKey({ brand: m.brand, name: m.name, carbonation: carb }))
      ?? rows[0]?.similarity ?? 0.5;
    siblings.push({
      id: m.id,
      name: m.name,
      brand: m.brand,
      quantity: m.quantity,
      image_path: m.image_path,
      similarity: baseSim,
      carbonation: carb,
      categorySlug: m.category_slug,
    });
  }

  // If search_products top-3 got crowded out by contradicting variants of the same brand, pull compatible siblings.
  const filterCarb = read.isWater ? (read.carbonation ?? null) : null;
  const compatibleRows = rows.filter((r) => !filterCarb || !r.carbonation || r.carbonation === filterCarb);
  const seedPool = compatibleRows.length ? compatibleRows : siblings;
  const brandOnly = Boolean(read.brand && !read.name);

  return dedupeCandidates(seedPool, siblings, read.quantity, filterCarb)
    .slice(0, 3)
    .map((row) => ({
      id: row.id,
      name: row.name,
      brand: row.brand,
      quantity: row.quantity,
      imageUrl: photoUrl(db, row.id, row.image_path),
      similarity: Math.min(brandOnly ? 0.55 : 1, Math.max(0, row.similarity)),
    }));
}

export function createService(deps = { adminClient, loadProduct, saveJpeg, askClaude, logEvent }) {
  return async ({ photo }: IdentifyRequest, device: string) => {
    const db = deps.adminClient();
    const event = await reserveUsage(db, device, 'photo'); // 40 per device per 24 h (C6 migration)
    let photoPath: string | undefined;
    let providerStarted = false;
    try {
      photoPath = await deps.saveJpeg(photo, device, 'front');
      // Claude gets the stored copy, which saveJpeg re-encoded without EXIF/GPS metadata.
      const stored = await db.storage.from('uploads').download(photoPath);
      if (stored.error) throw new Error('Private photo read failed');
      const image = toBase64(new Uint8Array(await stored.data.arrayBuffer()));
      validateProviderImages([image]);
      providerStarted = true;
      const read = parseFront(await deps.askClaude([image], FRONT_PROMPT));
      const found = read.code ? await deps.loadProduct({ code: read.code }) : null;
      const candidates = found ? [] : await findCandidates(db, read);
      const body = IdentifyResponse.parse(
        found
          ? { status: 'found', ...found, photoPath }
          : candidates.length
            ? { status: 'candidates', candidates, read, photoPath }
            : { status: 'not_found', read, photoPath },
      );
      try {
        if (found) await deps.logEvent('identified', device, found.product.id);
        else if (!candidates.length) await deps.logEvent('not_found', device);
      } catch {
        console.warn('Identify analytics unavailable'); // analytics must not hide a valid answer
      }
      return body;
    } catch (error) {
      // Failed requests return no reusable paths. Keep admission on uncertain/billed attempts.
      try {
        if (photoPath) {
          const { error } = await db.storage.from('uploads').remove([photoPath]);
          if (error) throw new Error('Private photo cleanup failed');
        }
      } finally {
        if (!providerStarted || error instanceof PreProviderError) await releaseUsage(db, event);
      }
      throw error;
    }
  };
}
export const identify = createService();
