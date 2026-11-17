import type { Product, ScoreResult } from '@okbite/shared';
import { previewEntries } from '../../test/fixtures';
import { productScoreFor } from '../product/productScoreFor';
import { TopProductsResponse, rankTop } from './topProducts';

type Entry = { product: Product; score: ScoreResult };
const [plain, strawberry, greek, , , juice] = previewEntries as Entry[] as [Entry, Entry, Entry, Entry, Entry, Entry];
const yogurts: Entry[] = [plain, strawberry, greek];
const clone = (entry: Entry, n: number, patch: Partial<Product>): Entry =>
  ({ score: entry.score, product: { ...entry.product, id: `0b6f3c1e-2d4a-4c8e-9f10-0000000000${10 + n}`, ...patch } });
const scoreOf = (entry: Entry) => productScoreFor(entry.product, entry.score).score!;

describe('rankTop', () => {
  it('sorts by the product score the app shows everywhere, best first', () => {
    const ranked = rankTop([...yogurts].reverse());
    expect(ranked.map(pick => pick.score)).toEqual(yogurts.map(scoreOf).sort((a, b) => b - a));
    for (const pick of ranked) expect(pick.tier).toBe(productScoreFor(pick.product, yogurts.find(entry => entry.product.id === pick.product.id)!.score).tier);
  });

  it('leaves out products that are not verified', () => {
    const ranked = rankTop([clone(plain, 1, { status: 'unverified', name: 'Neverificat' }), strawberry]);
    expect(ranked.map(pick => pick.product.id)).toEqual([strawberry.product.id]);
  });

  it('leaves out products without a score', () => {
    expect(productScoreFor(juice.product, juice.score).score).toBeNull();
    expect(rankTop([juice])).toEqual([]);
    expect(rankTop([juice, greek]).map(pick => pick.product.id)).toEqual([greek.product.id]);
  });

  it('breaks a tie by name, A to Z', () => {
    const ranked = rankTop([clone(plain, 1, { name: 'Zeta' }), clone(plain, 2, { name: 'Ăla' }), clone(plain, 3, { name: 'Beta' })]);
    expect(ranked.map(pick => pick.product.name)).toEqual(['Ăla', 'Beta', 'Zeta']);
  });

  it('keeps only the top three', () => {
    const ranked = rankTop([...yogurts, clone(plain, 1, { name: 'Al patrulea' }), clone(strawberry, 2, { name: 'Al cincilea' })]);
    expect(ranked).toHaveLength(3);
    expect(Math.min(...ranked.map(pick => pick.score))).toBeGreaterThanOrEqual(scoreOf(greek));
  });
});

describe('TopProductsResponse', () => {
  const good = { category: 'iaurt', products: yogurts.map(({ product, score }) => ({ product, score })) };
  it('accepts a category with product and score pairs, and an empty list', () => {
    expect(TopProductsResponse.safeParse(good).success).toBe(true);
    expect(TopProductsResponse.safeParse({ category: 'apa', products: [] }).success).toBe(true);
  });
  it.each([
    ['no category', { products: [] }],
    ['products not a list', { category: 'iaurt', products: {} }],
    ['a product without a score', { category: 'iaurt', products: [{ product: plain.product }] }],
    ['a product missing fields', { category: 'iaurt', products: [{ product: { id: plain.product.id, name: 'x' }, score: plain.score }] }],
    ['a score out of range', { category: 'iaurt', products: [{ product: plain.product, score: { ...plain.score, score: 140 } }] }],
  ])('rejects %s', (_name, body) => {
    expect(TopProductsResponse.safeParse(body).success).toBe(false);
  });
});
