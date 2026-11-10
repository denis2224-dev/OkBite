// Test-only state is isolated by x-device-id; facts reuse the existing prototype fixture.
const sessions = new Map();
const json = (res, body, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};
async function body(req) {
  let value = ''; for await (const chunk of req) value += chunk;
  return value ? JSON.parse(value) : {};
}
export async function unknownStub(req, res, url, example, categories) {
  const id = url.searchParams.get('id') ?? req.headers['x-device-id'];
  if (url.pathname === '/__test/session') {
    if (req.method === 'POST') {
      if (url.searchParams.has('release')) sessions.get(id)?.release?.();
      else sessions.set(id, { ...await body(req), calls: [], productId: id, result: null });
    }
    const session = sessions.get(id);
    json(res, session ? { calls: session.calls, productId: id } : {}, session ? 200 : 404);
    return true;
  }
  const session = sessions.get(id);
  if (!session || !url.pathname.startsWith('/functions/v1/')) return false;
  const name = url.pathname.split('/').at(-1);
  if (name === 'lookup') {
    json(res, session.result ?? { status: 'not_found' }); return true;
  }
  if (!['identify', 'read-label', 'add-product', 'enrich-product'].includes(name)) return false;
  if (req.method !== 'POST') { json(res, { error: 'bad_request' }, 405); return true; }
  const input = await body(req);
  session.calls.push({ name, body: input });
  if (session.hold === name) {
    await new Promise(resolve => { session.release = resolve; }); session.hold = ''; session.release = null;
  }
  const product = example.product;
  const empty = Object.fromEntries(Object.keys(product.nutrients).map(key => [key, null]));
  const partialUnbranded = session.scenario === 'partial-unbranded';
  if (name === 'identify') json(res, { status: 'not_found',
    read: { name: product.name, brand: partialUnbranded ? null : product.brand, quantity: product.quantity, code: null }, photoPath: `${id}/front.jpg` });
  if (name === 'read-label') {
    const absent = input.nutrition === 'none' || input.nutrition === 'skipped';
    const unreadable = session.scenario === 'unreadable';
    const nutrients = absent || unreadable ? empty : partialUnbranded ? { ...product.nutrients, fiber: null, fruitVegPct: null } : product.nutrients;
    // U1: a field is 'read' exactly when it has a value.
    const why = unreadable || (partialUnbranded && !absent) ? 'unreadable' : input.nutrition === 'skipped' ? 'not_photographed' : 'not_printed';
    const reason = key => nutrients[key] === null ? why : 'read';
    json(res, { ingredientsText: input.ingredientsImage === null ? null : product.ingredientsText, unit: 'g',
      nutrients,
      unclear: unreadable ? Object.keys(empty) : partialUnbranded && !absent ? ['fiber', 'fruitVegPct'] : [],
      ingredientsPhotoPath: input.ingredientsImage === null ? null : `${id}/ingredients.jpg`,
      nutritionPhotoPath: absent ? null : `${id}/nutrition.jpg`,
      reasons: { ...Object.fromEntries(Object.keys(empty).map(key => [key, reason(key)])),
        ingredientsText: input.ingredientsImage === null ? 'not_photographed' : 'read' } });
  }
  if (name === 'add-product' || name === 'enrich-product') {
    if (name === 'enrich-product' && (!session.result || input.productId !== id)) {
      json(res, { error: 'not_found' }, 404); return true;
    }
    const scored = JSON.stringify(input.nutrients) === JSON.stringify(product.nutrients) &&
      (input.categorySlug === product.category.slug || session.category === product.category.slug);
    session.category = input.categorySlug ?? session.category ?? 'necunoscut';
    session.result = { status: 'found', product: { ...product, ...session.result?.product,
      id, code: input.code ?? session.result?.product.code ?? null, status: 'unverified', verifiedAt: null, nutrients: input.nutrients,
      category: categories.find(category => category.slug === session.category),
      ...(name === 'add-product' ? { name: input.name, brand: input.brand, quantity: input.quantity, ingredientsText: input.ingredientsText } : {}) },
      score: scored ? example.score : { score: null, letter: null, grade: 'unavailable', reasons: [], missing: Object.keys(empty) } };
    json(res, session.result);
  }
  return true;
}
