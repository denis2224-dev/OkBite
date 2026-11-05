import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ResultView } from './ResultView';
import { ReportSheet } from './ReportSheet';
import { foundYogurt } from '../../test/fixtures';
import { ro } from '../../copy/ro';
import { api, ApiError } from '../../lib/api';

jest.mock('../../lib/api', () => ({ ...jest.requireActual('../../lib/api'), api: { report: jest.fn() } }));
it('shows allergens, unverified provenance and the disclaimer', async () => {
  await render(<ResultView product={{ ...foundYogurt.product, status: 'unverified', allergens: ['Lapte'], mayContain: ['Soia'] }} score={foundYogurt.score} />);
  expect(screen.getByText('Lapte')).toBeTruthy();
  expect(screen.getByText('Soia')).toBeTruthy();
  expect(screen.getByText(ro.result.unverifiedNote)).toBeTruthy();
  expect(screen.getByText(ro.score.disclaimer)).toBeTruthy();
});
it('never shows a zero score when required label values are missing', async () => {
  await render(<ResultView product={{ ...foundYogurt.product, nutrients: { ...foundYogurt.product.nutrients, salt: null } }} score={{ ...foundYogurt.score, score: 0, grade: 'low' }} />);
  expect(screen.getByText(ro.result.scoreUnavailable)).toBeTruthy();
  expect(screen.queryByLabelText(/0 din 100/)).toBeNull();
});
it('retains a failed report for retry and closes only after success', async () => {
  jest.mocked(api.report).mockRejectedValueOnce(new ApiError('offline')).mockResolvedValueOnce();
  const close = jest.fn();
  await render(<ReportSheet productId={foundYogurt.product.id} onClose={close} />);
  await fireEvent.press(screen.getByRole('button', { name: ro.result.reportSend }));
  expect(screen.getByText(ro.result.reportShort)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(ro.result.reportLabel), 'Etichetă diferită');
  await fireEvent.press(screen.getByRole('button', { name: ro.result.reportSend }));
  await waitFor(() => expect(screen.getByText(ro.errors.offline)).toBeTruthy());
  expect(screen.getByLabelText(ro.result.reportLabel).props.value).toBe('Etichetă diferită');
  expect(close).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: ro.result.reportSend }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(api.report).toHaveBeenLastCalledWith({ productId: foundYogurt.product.id, message: 'Etichetă diferită' });
});

it('preserves a supplied water score when label nutrients are absent', async () => {
  const product = { ...foundYogurt.product, category: { ...foundYogurt.product.category, scoreKind: 'water' as const }, nutrients: { ...foundYogurt.product.nutrients, kcal: null, salt: null, sugar: null, sat: null } };
  await render(<ResultView product={product} score={{ ...foundYogurt.score, score: 100, letter: 'A', grade: 'good' }} />);
  expect(screen.getByLabelText(ro.score.ringLabel(100, 'good'))).toBeTruthy();
});
it('withholds a fat-category score when total fat is missing', async () => {
  const product = { ...foundYogurt.product, category: { ...foundYogurt.product.category, scoreKind: 'fat' as const }, nutrients: { ...foundYogurt.product.nutrients, fat: null } };
  await render(<ResultView product={product} score={foundYogurt.score} />);
  expect(screen.getByText(ro.result.scoreUnavailable)).toBeTruthy();
});
