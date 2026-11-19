// Test-only state is isolated by x-device-id; facts reuse the existing prototype fixture.
const sessions = new Map();
const sharedWaters = new Map();
const json = (res, body, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};
async function body(req) {
  let value = ''; for await (const chunk of req) value += chunk;
  return value ? JSON.parse(value) : {};
}
function emptyWaterBase() {
  return {
    tdsMgL: 350, dryResidueMgL: null, ph: 7.5, carbonation: 'still', classification: 'drinking',
    caMgL: null, mgMgL: null, naMgL: null, kMgL: null, naPlusKMgL: null,
    hco3MgL: null, so4MgL: null, clMgL: null, fMgL: null, no3MgL: null, bMgL: null, h3bo3MgL: null, iUgL: null,
    evidence: {
      tdsMgL: { status: 'unverified', source: 'nordica.md' },
      ph: { status: 'unverified', source: 'nordica.md' },
      carbonation: { status: 'unverified', source: 'nordica.md' },
      classification: { status: 'unverified', source: 'nordica.md' },
    },
  };
}
export async function unknownStub(req, res, url, example, categories) {
  const id = url.searchParams.get('id') ?? req.headers['x-device-id'];
  if (url.pathname === '/__test/session') {
    if (req.method === 'POST') {
      if (url.searchParams.has('release')) sessions.get(id)?.release?.();
      else {
        const cfg = await body(req);
        if (cfg.scenario === 'water-shared' && cfg.sharedId && !sharedWaters.has(cfg.sharedId)) {
          const empty = Object.fromEntries(Object.keys(example.product.nutrients).map(k => [k, null]));
          const water = emptyWaterBase();
          sharedWaters.set(cfg.sharedId, {
            status: 'found',
            product: {
              ...example.product,
              id: cfg.sharedId,
              code: null,
              status: 'unverified',
              verifiedAt: null,
              name: 'Nordica Test',
              brand: 'Nordica',
              quantity: '1,5 L',
              unit: 'ml',
              portion: { amount: 100, label: '100 ml' },
              category: categories.find(c => c.slug === 'apa') ?? { slug: 'apa', name: 'Apă', scoreKind: 'water' },
              nutrients: empty,
              water,
              ingredientsText: '',
              ingredients: [],
              allergens: [],
              mayContain: [],
              source: 'Nordica Moldova',
            },
            score: {
              score: 100, letter: null, grade: 'good', reasons: [], missing: [],
              range: null, waterMissing: [], unverifiedUsed: true,
            },
          });
        }
        sessions.set(id, { ...cfg, calls: [], productId: id, result: null });
      }
    }
    const session = sessions.get(id);
    json(res, session ? { calls: session.calls, productId: id } : {}, session ? 200 : 404);
    return true;
  }
  const session = sessions.get(id);
  const sharedId = url.searchParams.get('id') ?? session?.sharedId;
  if (url.pathname.startsWith('/functions/v1/lookup') && sharedId && sharedWaters.has(sharedId)) {
    json(res, sharedWaters.get(sharedId));
    return true;
  }
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
  if (name === 'identify') json(res, { status: session.scenario === 'candidates' ? 'candidates' : 'not_found',
    ...(session.scenario === 'candidates' ? { candidates: [{ id: product.id, name: product.name, brand: product.brand,
      quantity: product.quantity, imageUrl: null, similarity: 0.52 }] } : {}),
    read: { name: product.name, brand: partialUnbranded ? null : product.brand, quantity: product.quantity, code: null }, photoPath: `${id}/front.jpg` });
  if (name === 'read-label') {
    if (input.kind === 'water') {
      json(res, {
        ingredientsText: null,
        unit: 'ml',
        nutrients: empty,
        water: { ...emptyWaterBase(), caMgL: 42, no3MgL: 0 },
        unclear: [],
        ingredientsPhotoPath: null,
        nutritionPhotoPath: `${id}/nutrition.jpg`,
        reasons: { ...Object.fromEntries(Object.keys(empty).map(key => [key, 'not_printed'])), ingredientsText: 'not_photographed' },
      });
      return true;
    }
    const absent = input.nutrition === 'none' || input.nutrition === 'skipped';
    const unreadable = session.scenario === 'unreadable';
    const nutrients = absent || unreadable ? empty : partialUnbranded ? { ...product.nutrients, fiber: null, fruitVegPct: null } : product.nutrients;
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
    if (name === 'enrich-product' && session.scenario === 'water-shared' && sharedWaters.has(input.productId)) {
      const entry = sharedWaters.get(input.productId);
      const nextWater = { ...entry.product.water };
      const evidence = { ...(nextWater.evidence ?? {}) };
      for (const [k, v] of Object.entries(input.water ?? {})) {
        if (k === 'ranges' || k === 'evidence') continue;
        if (v !== null && nextWater[k] === null) {
          nextWater[k] = v;
          evidence[k] = { status: 'unverified', source: 'Fotografie utilizator', addedAt: '2026-11-17' };
        }
      }
      nextWater.evidence = evidence;
      const updated = {
        ...entry,
        product: { ...entry.product, water: nextWater },
        waterSubmissionStatus: 'applied',
      };
      sharedWaters.set(input.productId, updated);
      json(res, updated);
      return true;
    }
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
