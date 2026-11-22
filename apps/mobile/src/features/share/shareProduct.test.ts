import { AccessibilityInfo, Platform, Share } from 'react-native';
import { emptyWaterProfile } from '@okbite/shared';
import { foundYogurt } from '../../test/fixtures';
import { ro } from '../../copy/ro';
import { productShareText } from './productShareText';
import { shareProduct } from './shareProduct';
import { productScoreFor } from '../product/productScoreFor';

const { product, score } = foundYogurt;
it('shares the authoritative score and public product link', async () => {
  const native = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
  const text = productShareText(product, score);
  expect(text).toBe(`${product.name} (${product.brand}): ${productScoreFor(product, score).score} din 100 pe OkBite\nhttps://okbite.md/product/${product.id}`);
  expect(text).toContain('86 din 100'); // same number as the result
  await expect(shareProduct(product, score)).resolves.toBe('shared');
  expect(native).toHaveBeenCalledWith({ message: text });
});
it('keeps an unavailable score distinct from a real zero', () => {
  expect(productShareText(product, { ...score, score: null })).toContain(ro.result.scoreUnavailable);
  expect(productShareText(product, { ...score, score: null })).not.toContain('0 din 100');
  // A real nutrition score of 0 still shares a number (the product score), never "unavailable".
  const zero = { ...score, score: 0, grade: 'low' as const };
  expect(productShareText(product, zero)).toContain(ro.share.score(productScoreFor(product, zero).score!));
  expect(productShareText(product, zero)).not.toContain(ro.result.scoreUnavailable);
});
it('uses a Romanian decimal comma in shared numeric copy', () => {
  expect(ro.share.score(13.2)).toBe('13,2 din 100');
});
it('does not report native dismissal as a completed share', async () => {
  jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.dismissedAction, activityType: undefined });
  await expect(shareProduct(product, score)).resolves.toBe('cancelled');
});
it('announces a share failure for VoiceOver and lets the view display it', async () => {
  jest.spyOn(Platform, 'select').mockImplementation((values) => values.ios);
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  jest.spyOn(Share, 'share').mockRejectedValue(new Error('Unavailable'));
  await expect(shareProduct(product, score)).rejects.toThrow('Unavailable');
  expect(announce).toHaveBeenCalledWith(ro.share.error);
});
afterEach(() => jest.restoreAllMocks());

it('does not share a numeric score when label data is insufficient', () => {
  expect(productShareText({ ...product, nutrients: { ...product.nutrients, salt: null } }, score)).toContain(ro.result.scoreUnavailable);
});

it('shares adaptive water ranges and withholds legacy 100/A scores when water chemistry is absent', () => {
  const emptyNutrients = Object.fromEntries(Object.keys(product.nutrients).map(k => [k, null])) as typeof product.nutrients;
  const { water: _w, ...withoutWater } = product;
  const legacyWater = {
    ...withoutWater,
    unit: 'ml' as const,
    category: { slug: 'apa', name: 'Apă', scoreKind: 'water' as const },
    nutrients: emptyNutrients,
    ingredientsText: '',
  };
  expect(productShareText(legacyWater, { score: 100, letter: 'A', grade: 'good', reasons: [], missing: [] }))
    .toContain(ro.result.scoreUnavailable);

  const partialWater = {
    ...legacyWater,
    status: 'unverified' as const,
    water: { ...emptyWaterProfile(), tdsMgL: 350, ph: 7.5, carbonation: 'still' as const },
  };
  const shared = productShareText(partialWater, { score: 100, letter: null, grade: 'good', reasons: [], missing: [] });
  expect(shared).toContain('100 din 100');
  expect(shared).toContain(ro.result.water.unverifiedNote);
});
