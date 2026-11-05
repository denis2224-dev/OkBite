import { foundYogurt } from '../../test/fixtures';
import { shareProduct } from './shareProduct.web';
import { productShareText } from './productShareText';
const { product, score } = foundYogurt;
const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
function browser(value: object) { Object.defineProperty(globalThis, 'navigator', { value, configurable: true }); }
afterEach(() => { if (original) Object.defineProperty(globalThis, 'navigator', original); else Reflect.deleteProperty(globalThis, 'navigator'); });
it('opens Web Share with the product text', async () => {
  const share = jest.fn().mockResolvedValue(undefined);
  browser({ share });
  await expect(shareProduct(product, score)).resolves.toBe('shared');
  expect(share).toHaveBeenCalledWith({ text: productShareText(product, score) });
});
it('copies the public link when Web Share is unavailable', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  browser({ clipboard: { writeText } });
  await expect(shareProduct(product, score)).resolves.toBe('copied');
  expect(writeText).toHaveBeenCalledWith(`https://okbite.md/product/${product.id}`);
});
it('falls back to copying when Web Share fails', async () => {
  let copied = '';
  browser({ share: async () => { throw new Error('Blocked'); }, clipboard: { writeText: async (text: string) => { copied = text; } } });
  await expect(shareProduct(product, score)).resolves.toBe('copied');
  expect(copied).toBe(`https://okbite.md/product/${product.id}`);
});
it('leaves a cancelled share alone without writing the clipboard', async () => {
  const writeText = jest.fn();
  browser({ share: async () => { throw Object.assign(new Error('Cancelled'), { name: 'AbortError' }); }, clipboard: { writeText } });
  await expect(shareProduct(product, score)).resolves.toBe('cancelled');
  expect(writeText).not.toHaveBeenCalled();
});
it('rejects when neither sharing nor clipboard is available', async () => {
  browser({});
  await expect(shareProduct(product, score)).rejects.toThrow();
});
it('rejects clipboard denial so the UI can offer retry or manual copy', async () => {
  browser({ clipboard: { writeText: async () => { throw new Error('Denied'); } } });
  await expect(shareProduct(product, score)).rejects.toThrow('Denied');
});
