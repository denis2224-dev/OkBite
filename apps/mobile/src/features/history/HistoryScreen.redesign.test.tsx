import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { HistoryScreen } from './HistoryScreen';
import { listHistory, removeFromHistory, type HistoryEntry } from './store';
import { foundYogurt } from '../../test/fixtures';
import { ToastProvider } from '../../ui/Toast';
import { ro } from '../../copy/ro';

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: (effect: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]) }));
let mockHistoryListener: () => void;
jest.mock('./store', () => ({
  listHistory: jest.fn(),
  removeFromHistory: jest.fn(),
  restoreToHistory: jest.fn(),
  subscribeHistory: (listener: () => void) => { mockHistoryListener = listener; return jest.fn(); },
}));
let mockQueueListener: () => void;
jest.mock('../offline/queue', () => ({ subscribeQueue: (listener: () => void) => { mockQueueListener = listener; return jest.fn(); } }));
const entry: HistoryEntry = { ...foundYogurt, savedAt: '2026-11-05T09:00:00.000Z' };
const second: HistoryEntry = { ...entry, savedAt: '2026-11-06T09:00:00.000Z', product: { ...entry.product, id: '00000000-0000-4000-8000-000000000002', name: 'Pâine cu semințe', brand: 'Brutăria' } };
const openName = (name: string) => new RegExp(ro.history.open(name));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(listHistory).mockResolvedValue([entry, second]);
  jest.mocked(removeFromHistory).mockResolvedValue();
});
it('keeps newest first and has no search field', async () => {
  await render(<HistoryScreen/>);
  await screen.findByRole('button', { name: openName(entry.product.name) });
  const rows = screen.getAllByRole('button', { name: /Deschide/ });
  expect(rows[0]!.props.accessibilityLabel).toContain(second.product.name);
  expect(screen.queryByLabelText(ro.history.search)).toBeNull();
});
const ask = (name: string) => fireEvent(screen.getByRole('button', { name: new RegExp(ro.history.open(name)) }), 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
it('asks before deleting, deletes only on "Șterge", and shows no removed message or undo', async () => {
  await render(<ToastProvider><HistoryScreen/></ToastProvider>);
  await screen.findByRole('button', { name: openName(entry.product.name) });
  await ask(entry.product.name);
  expect(screen.getByText(ro.history.deleteTitle)).toBeTruthy();
  expect(removeFromHistory).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: ro.app.cancel }));
  expect(removeFromHistory).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: openName(entry.product.name) })).toBeTruthy();
  await ask(entry.product.name);
  await fireEvent.press(screen.getByRole('button', { name: ro.history.swipeDelete }));
  await waitFor(() => expect(screen.queryByRole('button', { name: openName(entry.product.name) })).toBeNull());
  expect(removeFromHistory).toHaveBeenCalledWith(entry.product.id);
  expect(screen.getByRole('button', { name: openName(second.product.name) })).toBeTruthy();
  expect(screen.queryByText(/șters din istoric/)).toBeNull();
  expect(screen.queryByText(/Anulează ștergerea/)).toBeNull();
});
it('does not delete on a long press', async () => {
  await render(<HistoryScreen/>);
  await fireEvent(await screen.findByRole('button', { name: openName(entry.product.name) }), 'longPress');
  expect(removeFromHistory).not.toHaveBeenCalled();
});
it('keeps a row when delete fails', async () => {
  jest.mocked(removeFromHistory).mockRejectedValueOnce(new Error('disk'));
  await render(<ToastProvider><HistoryScreen/></ToastProvider>);
  await screen.findByRole('button', { name: openName(entry.product.name) });
  await ask(entry.product.name);
  await fireEvent.press(screen.getByRole('button', { name: ro.history.swipeDelete }));
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

it('refreshes after a scan save that commits after History initially loads', async () => {
  jest.mocked(listHistory).mockResolvedValueOnce([]).mockResolvedValue([entry]);
  await render(<HistoryScreen/>);
  await screen.findByText(ro.history.design.emptyTitle);
  await act(() => mockHistoryListener());
  expect(await screen.findByRole('button', { name: openName(entry.product.name) })).toBeTruthy();
});
