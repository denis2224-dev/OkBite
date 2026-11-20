import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { HistoryScreen } from './HistoryScreen';
import { clearHistory, listHistory, removeFromHistory, restoreToHistory, type HistoryEntry } from './store';
import { foundYogurt } from '../../test/fixtures';
import { ToastProvider } from '../../ui/Toast';
import { ro } from '../../copy/ro';

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: (effect: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]) }));
jest.mock('./store', () => ({ listHistory: jest.fn(), clearHistory: jest.fn(), removeFromHistory: jest.fn(), restoreToHistory: jest.fn() }));
let mockQueueListener: () => void;
jest.mock('../offline/queue', () => ({ subscribeQueue: (listener: () => void) => { mockQueueListener = listener; return jest.fn(); } }));
const entry: HistoryEntry = { ...foundYogurt, savedAt: '2026-11-05T09:00:00.000Z' };
const second: HistoryEntry = { ...entry, savedAt: '2026-11-06T09:00:00.000Z', product: { ...entry.product, id: '00000000-0000-4000-8000-000000000002', name: 'Pâine cu semințe', brand: 'Brutăria' } };
const openName = (name: string) => new RegExp(ro.history.open(name));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(listHistory).mockResolvedValue([entry, second]);
  jest.mocked(removeFromHistory).mockResolvedValue();
  jest.mocked(restoreToHistory).mockResolvedValue();
});
it('keeps newest first and has no search field', async () => {
  await render(<HistoryScreen/>);
  await screen.findByRole('button', { name: openName(entry.product.name) });
  const rows = screen.getAllByRole('button', { name: /Deschide/ });
  expect(rows[0]!.props.accessibilityLabel).toContain(second.product.name);
  expect(screen.queryByLabelText(ro.history.search)).toBeNull();
});
it('removes one record on long press and offers undo that restores the saved date', async () => {
  await render(<ToastProvider><HistoryScreen/></ToastProvider>);
  const row = await screen.findByRole('button', { name: new RegExp(ro.history.open(entry.product.name)) });
  await fireEvent(row, 'longPress');
  await waitFor(() => expect(screen.queryByRole('button', { name: openName(entry.product.name) })).toBeNull());
  expect(screen.getByRole('button', { name: openName(second.product.name) })).toBeTruthy();
  expect(screen.getByText(ro.history.removed)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.history.undo }));
  await waitFor(() => expect(screen.getByRole('button', { name: openName(entry.product.name) })).toBeTruthy());
  expect(restoreToHistory).toHaveBeenCalledWith(entry);
});
it('keeps a row when delete fails, deleting through the accessible delete action', async () => {
  jest.mocked(removeFromHistory).mockRejectedValueOnce(new Error('disk'));
  await render(<ToastProvider><HistoryScreen/></ToastProvider>);
  await screen.findByRole('button', { name: openName(entry.product.name) });
  await fireEvent(screen.getByRole('button', { name: new RegExp(ro.history.open(entry.product.name)) }), 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
  await screen.findByText(ro.history.removeError);
  expect(screen.getByRole('button', { name: openName(entry.product.name) })).toBeTruthy();
});
it('shows the photo in the row and fără scor for unavailable scores', async () => {
  jest.mocked(listHistory).mockResolvedValue([{ ...entry, product: { ...entry.product, imageUrl: 'https://example.com/product.jpg' }, score: { ...entry.score, score: null, grade: 'unavailable' } }]);
  await render(<HistoryScreen/>);
  await screen.findByRole('button', { name: openName(entry.product.name) });
  expect(screen.getByTestId('history-photo')).toBeTruthy();
  expect(screen.getByText(ro.history.noScore)).toBeTruthy();
  expect(screen.queryByText('0')).toBeNull();
});
it('keeps failed undo retryable and shows a newer scan after restoration succeeds', async () => {
  const updated = { ...entry, product: { ...entry.product, name: 'Produs scanat din nou' } };
  jest.mocked(listHistory).mockResolvedValueOnce([entry, second]).mockResolvedValue([updated, second]);
  jest.mocked(restoreToHistory).mockRejectedValueOnce(new Error('disk')).mockResolvedValueOnce();
  await render(<ToastProvider><HistoryScreen/></ToastProvider>);
  await screen.findByRole('button', { name: openName(entry.product.name) });
  await fireEvent(screen.getByRole('button', { name: new RegExp(ro.history.open(entry.product.name)) }), 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
  await screen.findByText(ro.history.removed);
  await fireEvent.press(screen.getByRole('button', { name: ro.history.undo }));
  await screen.findByText(ro.history.restoreError);
  expect(screen.queryByRole('button', { name: openName(entry.product.name) })).toBeNull();
  expect(screen.queryByText(ro.history.removeError)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: ro.history.undo }));
  await screen.findByRole('button', { name: openName(updated.product.name) });
  expect(screen.getByRole('button', { name: openName(second.product.name) })).toBeTruthy();
  expect(screen.queryByRole('button', { name: openName(entry.product.name) })).toBeNull();
  expect(screen.queryByText(ro.history.restoreError)).toBeNull();
});

it('refreshes queue-saved products when a queue event arrives during deletion', async () => {
  const queued = { ...second, product: { ...second.product, id: '00000000-0000-4000-8000-000000000003', name: 'Produs din coadă' } };
  let finish!: () => void;
  jest.mocked(removeFromHistory).mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve; }));
  jest.mocked(listHistory).mockResolvedValueOnce([entry, second]).mockResolvedValue([queued, second]);
  await render(<HistoryScreen/>);
  await screen.findByRole('button', { name: openName(entry.product.name) });
  await fireEvent(screen.getByRole('button', { name: new RegExp(ro.history.open(entry.product.name)) }), 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
  await act(() => mockQueueListener());
  await act(() => finish());
  await screen.findByRole('button', { name: openName(queued.product.name) });
  expect(screen.queryByRole('button', { name: openName(entry.product.name) })).toBeNull();
  expect(screen.getByRole('button', { name: openName(second.product.name) })).toBeTruthy();
});

it('keeps clear failure visible when a queued refresh completes', async () => {
  const queued = { ...second, product: { ...second.product, id: '00000000-0000-4000-8000-000000000003', name: 'Produs din coadă' } };
  let fail!: (error: Error) => void;
  jest.mocked(clearHistory).mockReturnValueOnce(new Promise<void>((_, reject) => { fail = reject; }));
  jest.mocked(listHistory).mockResolvedValueOnce([entry, second]).mockResolvedValue([entry, queued, second]);
  await render(<HistoryScreen/>);
  await screen.findByRole('button', { name: openName(entry.product.name) });
  await fireEvent.press(screen.getByRole('button', { name: ro.history.clear }));
  await fireEvent.press(screen.getByRole('button', { name: ro.history.clearConfirm }));
  await act(() => mockQueueListener());
  await act(() => fail(new Error('disk')));
  await screen.findByRole('button', { name: openName(queued.product.name) });
  expect(screen.getByText(ro.history.clearError)).toBeTruthy();
});
