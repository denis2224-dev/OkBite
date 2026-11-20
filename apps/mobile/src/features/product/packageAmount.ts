import type { Product } from '@okbite/shared';

// How many g or ml one unit of each written measure is.
const factor: Record<string, { per: number; kind: 'g' | 'ml' }> = {
  mg: { per: 0.001, kind: 'g' }, g: { per: 1, kind: 'g' }, kg: { per: 1000, kind: 'g' },
  ml: { per: 1, kind: 'ml' }, cl: { per: 10, kind: 'ml' }, dl: { per: 100, kind: 'ml' }, l: { per: 1000, kind: 'ml' },
};
const measure = /(\d+(?:\.\d+)?)\s*(mg|kg|g|ml|cl|dl|l)\b/;
const multipack = /^(\d+)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(mg|kg|g|ml|cl|dl|l)\b/;

/** The whole package in the product's own unit (g or ml), read from its printed weight ("400 g", "0,5 l", "6 x 250 ml").
 * Null when the text has no clear weight or its unit does not match the product's. */
export function packageAmount(product: Pick<Product, 'quantity' | 'unit'>): number | null {
  const text = product.quantity.toLowerCase().replace(/,/g, '.').trim();
  const pack = multipack.exec(text);
  const single = pack ? null : measure.exec(text);
  const [count, value, unit] = pack ? [Number(pack[1]), Number(pack[2]), pack[3]!] : single ? [1, Number(single[1]), single[2]!] : [0, 0, ''];
  const found = factor[unit];
  if (!found || found.kind !== product.unit) return null;
  const amount = count * value * found.per;
  return amount > 0 ? Math.round(amount * 100) / 100 : null;
}
