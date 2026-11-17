import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product, ScoreResult } from '../_shared/contract.ts';
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
type RankedCandidate = Candidate & { score: { score: number } };
const PAGE_SIZE = 500;

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
  const byRank = (a: RankedCandidate, b: RankedCandidate) =>
    b.score.score - a.score.score || a.product.name.localeCompare(b.product.name, 'ro');
  let afterId: string | undefined;
  while (true) {
    const query = selectProductRows(db).eq('category_slug', category).eq('status', 'verified')
      .order('id').limit(PAGE_SIZE);
    const { data, error } = await (afterId ? query.gt('id', afterId) : query);
    if (error) throw new Error('Shelf product lookup failed');
    for (const row of data) {
      const product = productFromRow(db, row);
      if (product.category.slug !== category) continue;
      const score = scoreProduct(product);
      if (score.score !== null) ranked.push({ product, score: { ...score, score: score.score } });
    }
    ranked.sort(byRank);
    if (ranked.length > limit) ranked.length = limit;
    if (data.length < PAGE_SIZE) break;
    afterId = data.at(-1)!.id;
  }
  if (ranked.length === 0) return [];

  // The nutrition score uses the ingredient text. Only returned products need ingredient links.
  const links = await loadIngredientLinks(db, ranked.map(({ product }) => product.id));
  const kb = ranked.some(({ product }) => !links.has(product.id) && product.ingredientsText.trim())
    ? await loadIngredientKnowledgeBase(db)
    : undefined;
  for (const { product } of ranked) {
    product.ingredients = productIngredients(
      product.ingredientsText,
      links.get(product.id) ?? [],
      kb,
    );
  }
  return ranked;
}
