import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { HistoryScreen } from './HistoryScreen';
import { listHistory, removeFromHistory, restoreToHistory, type HistoryEntry } from './store';
import { foundYogurt } from '../../test/fixtures';
import { ToastProvider } from '../../ui/Toast';
import { ro } from '../../copy/ro';

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: (effect: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]) }));
jest.mock('./store', () => ({ listHistory: jest.fn(), clearHistory: jest.fn(), removeFromHistory: jest.fn(), restoreToHistory: jest.fn() }));
jest.mock('../offline/queue', () => ({ subscribeQueue: () => jest.fn() }));
const entry: HistoryEntry = { ...foundYogurt, savedAt: '2026-11-05T09:00:00.000Z' };
const second: HistoryEntry = { ...entry, savedAt: '2026-11-06T09:00:00.000Z', product: { ...entry.product, id: '00000000-0000-4000-8000-000000000002', name: 'Pâine cu semințe', brand: 'Brutăria' } };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(listHistory).mockResolvedValue([entry, second]);
  jest.mocked(removeFromHistory).mockResolvedValue();
  jest.mocked(restoreToHistory).mockResolvedValue();
});
it('filters by name and brand without losing saved records and keeps newest first', async () => {
  await render(<HistoryScreen/>);
  await screen.findByText(entry.product.name);
  const rows = screen.getAllByRole('button', { name: /Deschide/ });
  expect(rows[0]!.props.accessibilityLabel).toContain(second.product.name);
  await fireEvent.changeText(screen.getByLabelText(ro.history.search), ' BRUTĂRIA ');
  expect(screen.getByText(second.product.name)).toBeTruthy();
  expect(screen.queryByText(entry.product.name)).toBeNull();
  await fireEvent.changeText(screen.getByLabelText(ro.history.search), 'semințe');
  expect(screen.getByText(second.product.name)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(ro.history.search), 'nu există');
  expect(screen.getByText(ro.history.noMatches)).toBeTruthy();
  expect(screen.queryByText(ro.history.design.emptyTitle)).toBeNull();
  await fireEvent.changeText(screen.getByLabelText(ro.history.search), '');
  expect(screen.getByText(entry.product.name)).toBeTruthy();
});
it('removes one record on long press and offers undo that restores the saved date', async () => {
  await render(<ToastProvider><HistoryScreen/></ToastProvider>);
  const row = await screen.findByRole('button', { name: new RegExp(ro.history.open(entry.product.name)) });
  await fireEvent(row, 'longPress');
  await waitFor(() => expect(screen.queryByText(entry.product.name)).toBeNull());
  expect(screen.getByText(second.product.name)).toBeTruthy();
  expect(screen.getByText(ro.history.removed)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.history.undo }));
  await waitFor(() => expect(screen.getByText(entry.product.name)).toBeTruthy());
  expect(restoreToHistory).toHaveBeenCalledWith(entry);
});
it('keeps a row when delete fails and provides an accessible delete button', async () => {
  jest.mocked(removeFromHistory).mockRejectedValueOnce(new Error('disk'));
  await render(<ToastProvider><HistoryScreen/></ToastProvider>);
  await screen.findByText(entry.product.name);
  await fireEvent.press(screen.getByRole('button', { name: ro.history.remove(entry.product.name) }));
  await screen.findByText(ro.history.removeError);
  expect(screen.getByText(entry.product.name)).toBeTruthy();
});
it('shows a thumbnail when supplied and a dash for unavailable scores', async () => {
  jest.mocked(listHistory).mockResolvedValue([{ ...entry, product: { ...entry.product, imageUrl: 'https://example.com/product.jpg' }, score: { ...entry.score, score: null, grade: 'unavailable' } }]);
  await render(<HistoryScreen/>);
  await screen.findByText(entry.product.name);
  expect(screen.getByTestId('history-thumbnail').props.source).toEqual({ uri: 'https://example.com/product.jpg' });
  expect(screen.getByText('—')).toBeTruthy();
  expect(screen.queryByText('0')).toBeNull();
});
