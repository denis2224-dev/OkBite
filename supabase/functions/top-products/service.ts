import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product, ScoreResult } from '../_shared/contract.ts';
import { productScore } from '../_shared/score/index.ts';
import {
  loadIngredientKnowledgeBase,
  PRODUCT_INGREDIENT_COLUMNS,
  productFromRow,
  type ProductIngredientLink,
  productIngredients,
  scoreProduct,
  selectProductRows,
} from '../_lib/db.ts';
import { HttpError } from '../_lib/http.ts';

type Candidate = { product: Product; score: ScoreResult };
type RankedCandidate = { candidate: Candidate; rank: number };
const PAGE_SIZE = 500;
// Bound the number of UUIDs in each PostgREST URL.
const INGREDIENT_BATCH_SIZE = 100;
const byRank = (a: RankedCandidate, b: RankedCandidate) =>
  b.rank - a.rank ||
  a.candidate.product.name.localeCompare(b.candidate.product.name, 'ro') ||
  a.candidate.product.id.localeCompare(b.candidate.product.id);

async function loadIngredientLinks(db: SupabaseClient, ids: string[]) {
  const byProduct = new Map<string, ProductIngredientLink[]>();
  for (let offset = 0;; offset += PAGE_SIZE) {
    const { data, error } = await db.from('product_ingredients')
      .select(`product_id,${PRODUCT_INGREDIENT_COLUMNS}`)
      .in('product_id', ids)
      .order('product_id').order('position')
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error('Shelf ingredient lookup failed');
    for (const link of data) {
      const links = byProduct.get(link.product_id);
      if (links) links.push(link);
      else byProduct.set(link.product_id, [link]);
    }
    if (data.length < PAGE_SIZE) return byProduct;
  }
}

export async function loadShelfCandidates(
  category: string,
  limit: number,
  db: SupabaseClient,
): Promise<Candidate[]> {
  const categoryResult = await db.from('categories').select('slug').eq('slug', category)
    .maybeSingle();
  if (categoryResult.error) throw new Error('Shelf category lookup failed');
  if (!categoryResult.data) throw new HttpError(400, 'Categorie necunoscută.');
  if (category === 'necunoscut') return [];

  const ranked: RankedCandidate[] = [];
  let kb: Awaited<ReturnType<typeof loadIngredientKnowledgeBase>> | undefined;
  let afterId: string | undefined;
  while (true) {
    const query = selectProductRows(db).eq('category_slug', category).eq('status', 'verified')
      .order('id').limit(PAGE_SIZE);
    const { data, error } = await (afterId ? query.gt('id', afterId) : query);
    if (error) throw new Error('Shelf product lookup failed');

    const candidates: Candidate[] = [];
    for (const row of data) {
      const product = productFromRow(db, row);
      if (product.category.slug !== category) continue;
      const score = scoreProduct(product);
      if (score.score !== null) candidates.push({ product, score });
    }

    for (let offset = 0; offset < candidates.length; offset += INGREDIENT_BATCH_SIZE) {
      const batch = candidates.slice(offset, offset + INGREDIENT_BATCH_SIZE);
      const links = await loadIngredientLinks(db, batch.map(({ product }) => product.id));
      if (!kb && batch.some(({ product }) => !links.has(product.id) && product.ingredientsText.trim())) {
        kb = await loadIngredientKnowledgeBase(db);
      }
      for (const candidate of batch) {
        const { product, score } = candidate;
        product.ingredients = productIngredients(
          product.ingredientsText,
          links.get(product.id) ?? [],
          kb,
        );
        // scoreProduct uses the resolved category and the same nutrition computation as lookup.
        const { score: rank } = productScore(product, score);
        if (rank !== null) ranked.push({ candidate, rank });
      }
      ranked.sort(byRank);
      if (ranked.length > limit) ranked.length = limit;
    }
    if (data.length < PAGE_SIZE) break;
    afterId = data.at(-1)!.id;
  }
  return ranked.map(({ candidate }) => candidate);
}
