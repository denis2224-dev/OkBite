import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ResultView } from '../product/ResultView';
import { ToastProvider } from '../../ui/Toast';
import { foundYogurt } from '../../test/fixtures';
import { ro } from '../../copy/ro';
import { shareProduct } from './shareProduct';

jest.mock('./shareProduct', () => ({ shareProduct: jest.fn() }));
afterEach(() => jest.resetAllMocks());
it('shares the displayed unavailable score when required nutrients are missing', async () => {
  jest.mocked(shareProduct).mockResolvedValue('cancelled');
  await render(<ResultView product={{ ...foundYogurt.product, nutrients: { ...foundYogurt.product.nutrients, salt: null } }} score={foundYogurt.score} />);
  await fireEvent.press(screen.getByRole('button', { name: ro.share.button }));
  await waitFor(() => expect(shareProduct).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ score: null })));
  expect(screen.queryByText(ro.share.error)).toBeNull();
  expect(screen.queryByText(ro.share.copied)).toBeNull();
});
it('offers manual link copying and retry after failure, then confirms clipboard success', async () => {
  jest.mocked(shareProduct).mockRejectedValueOnce(new Error('Denied')).mockResolvedValueOnce('copied');
  await render(<ToastProvider><ResultView {...foundYogurt} /></ToastProvider>);
  await fireEvent.press(screen.getByRole('button', { name: ro.share.button }));
  await waitFor(() => expect(screen.getByText(ro.share.error)).toBeTruthy());
  const link = screen.getByText(`https://okbite.md/product/${foundYogurt.product.id}`);
  expect(link.props.selectable).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: ro.share.button }));
  await waitFor(() => expect(screen.getByText(ro.share.copied)).toBeTruthy());
  expect(screen.queryByText(ro.share.error)).toBeNull();
});
