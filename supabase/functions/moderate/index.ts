import { removeHiddenPhotos } from './photos.ts';
import { z } from 'npm:zod@3.23.8';
import { ModerateRequest, Uuid } from '../_shared/contract.ts';
import { normalizeCode } from '../_shared/ean/index.ts';
import { detectAllergens } from '../_shared/allergens/index.ts';
import { matchIngredients } from '../add-product/matchIngredients.ts';
import { adminClient, cors, fail, HttpError, json, readJsonBody, withCors } from '../_lib/http.ts';

export async function authorize(req: Request): Promise<string | null> {
  const token = req.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return null;
  const db = adminClient();
  const user = await db.auth.getUser(token);
  if (user.error || !user.data.user) return null;
  const member = await db.from('moderators').select('user_id').eq('user_id', user.data.user.id)
    .maybeSingle();
  if (member.error) throw new Error('Moderator lookup failed');
  return member.data ? Uuid.parse(user.data.user.id) : null;
}
export async function moderate(input: ModerateRequest, actor: string): Promise<void> {
  const db = adminClient();
  let product: Record<string, unknown> | null = null;
  let links: { rawName: string; slug: string | null }[] | null = null;
  if (input.action === 'verify') {
    const kb = await db.from('ingredients').select('slug,name,aliases');
    if (kb.error) throw new Error('Ingredient lookup failed');
    const p = input.product;
    const { fruitVegPct, ...nutrients } = p.nutrients;
    const allergens = detectAllergens(p.ingredientsText);
    product = {
      code: p.code,
      name: p.name,
      brand: p.brand,
      quantity: p.quantity,
      category_slug: p.categorySlug,
      unit: p.unit,
      ...nutrients,
      fruit_veg_pct: fruitVegPct,
      ingredients_text: p.ingredientsText,
      allergens: allergens.allergens,
      may_contain: allergens.mayContain,
    };
    links = matchIngredients(p.ingredientsText, kb.data ?? []);
  }
  const { error } = await db.rpc('moderate_product', {
    p_actor: actor,
    p_action: input.action,
    p_id: input.action === 'close_report' ? input.reportId : input.productId,
    p_product: product,
    p_links: links,
    p_reason: input.action === 'hide' ? input.reason : null,
  });
  if (error?.code === '42501') throw new HttpError(401, 'Acces neautorizat.', 'unauthorized');
  if (error?.code === 'P0002') throw new HttpError(404, 'Înregistrare negăsită.', 'not_found');
  if (error?.code === '23505') throw new HttpError(409, 'Codul este deja utilizat.', 'duplicate');
  if (error?.code === '23503') throw new HttpError(400, 'Categorie necunoscută.');
  if (error) throw new Error('Moderation transaction failed');
  if (input.action === 'hide') await removeHiddenPhotos(input.productId, db);
}
const success = z.object({ status: z.literal('ok') });
export function createHandler(deps = { authorize, moderate }) {
  return async (req: Request): Promise<Response> => {
    const preflight = cors(req);
    if (preflight) return preflight;
    let response: Response;
    try {
      if (req.method !== 'POST') {
        response = fail('bad_request', 'Metodă nepermisă.', 405);
        response.headers.set('allow', 'POST, OPTIONS');
      } else {
        const actor = await deps.authorize(req);
        if (!actor) throw new HttpError(401, 'Acces neautorizat.', 'unauthorized');
        const input = await readJsonBody(req, ModerateRequest);
        if (
          input.action === 'verify' && input.product.code !== null &&
          normalizeCode(input.product.code) !== input.product.code
        ) throw new HttpError(400);
        await deps.moderate(input, actor);
        response = json(success.parse({ status: 'ok' }));
      }
    } catch (error) {
      response = error instanceof HttpError
        ? fail(error.error, error.message, error.status)
        : fail('upstream_failed', 'Serviciul nu este disponibil momentan.', 502);
    }
    return withCors(req, response);
  };
}
export const handler = createHandler();
if (import.meta.main) Deno.serve(handler);
