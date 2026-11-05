import { Share } from 'react-native';
import { foundYogurt } from '../../test/fixtures';
import { ro } from '../../copy/ro';
import { productShareText } from './productShareText';
import { shareProduct } from './shareProduct';

const { product, score } = foundYogurt;
it('shares the authoritative score and public product link', async () => {
  const native = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
  const text = productShareText(product, score);
  expect(text).toBe(`${product.name} (${product.brand}): ${score.score} din 100 pe OkBite\nhttps://okbite.md/product/${product.id}`);
  await expect(shareProduct(product, score)).resolves.toBe('shared');
  expect(native).toHaveBeenCalledWith({ message: text });
});
it('keeps an unavailable score distinct from a real zero', () => {
  expect(productShareText(product, { ...score, score: null })).toContain(ro.result.scoreUnavailable);
  expect(productShareText(product, { ...score, score: null })).not.toContain('0 din 100');
  expect(productShareText(product, { ...score, score: 0, grade: 'low' })).toContain('0 din 100');
});
it('uses a Romanian decimal comma in shared numeric copy', () => {
  expect(ro.share.score(13.2)).toBe('13,2 din 100');
});
it('does not report native dismissal as a completed share', async () => {
  jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.dismissedAction, activityType: undefined });
  await expect(shareProduct(product, score)).resolves.toBe('cancelled');
});
it('lets the result view display a native failure', async () => {
  jest.spyOn(Share, 'share').mockRejectedValue(new Error('Unavailable'));
  await expect(shareProduct(product, score)).rejects.toThrow('Unavailable');
});
afterEach(() => jest.restoreAllMocks());

it('does not share a numeric score when label data is insufficient', () => {
  expect(productShareText({ ...product, nutrients: { ...product.nutrients, salt: null } }, score)).toContain(ro.result.scoreUnavailable);
});
