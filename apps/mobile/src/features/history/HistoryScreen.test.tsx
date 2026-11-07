import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { HistoryScreen } from './HistoryScreen';
import { clearHistory, listHistory, type HistoryEntry } from './store';
import { foundYogurt } from '../../test/fixtures';
import { ro } from '../../copy/ro';

let mockFocus: () => () => void;
let mockBlur: () => void;
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => () => void) => {
    jest.requireActual<typeof import('react')>('react').useEffect(() => {
      mockFocus = effect;
      mockBlur = effect();
      return () => mockBlur();
    }, [effect]);
  },
}));
jest.mock('./store', () => ({ listHistory: jest.fn(), clearHistory: jest.fn() }));
jest.mock('../offline/queue', () => ({ subscribeQueue: () => jest.fn() }));
const entry: HistoryEntry = { ...foundYogurt, savedAt: '2026-11-05T09:00:00.000Z' };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
async function refocus() {
  await act(() => { mockBlur(); mockBlur = mockFocus(); });
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(listHistory).mockResolvedValue([entry]);
  jest.mocked(clearHistory).mockResolvedValue();
});
it('shows loading before an empty saved history', async () => {
  const pending = deferred<HistoryEntry[]>();
  jest.mocked(listHistory).mockReturnValue(pending.promise);
  await render(<HistoryScreen />);
  expect(screen.getByText(ro.app.loading)).toBeTruthy();
  expect(screen.queryByText(ro.history.design.emptyTitle)).toBeNull();
  await act(() => pending.resolve([]));
  expect(screen.getByText(ro.history.design.emptyTitle)).toBeTruthy();
});
it('retries storage failures and opens the saved record through the cached route', async () => {
  jest.mocked(listHistory).mockRejectedValueOnce(new Error('disk')).mockResolvedValueOnce([entry]);
  await render(<HistoryScreen />);
  await waitFor(() => expect(screen.getByText(ro.history.loadError)).toBeTruthy());
  expect(screen.queryByText(ro.history.design.emptyTitle)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: ro.app.retry }));
  await waitFor(() => expect(screen.getByText(entry.product.name)).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: ro.history.open(entry.product.name) }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/product/[id]', params: { id: entry.product.id, cached: '1' } });
});
it('shows source dates and an unavailable score without inventing zero', async () => {
  jest.mocked(listHistory).mockResolvedValue([{ ...entry, score: { ...entry.score, score: null, grade: 'unavailable' } }]);
  await render(<HistoryScreen />);
  await waitFor(() => expect(screen.getByText(entry.product.source)).toBeTruthy());
  expect(screen.getByText(`${ro.result.added}: ${entry.product.addedAt.split('-').reverse().join('.')}`)).toBeTruthy();
  expect(screen.getByText(ro.result.scoreUnavailable)).toBeTruthy();
  expect(screen.queryByText('0 din 100')).toBeNull();
});
it('keeps the list when deletion is canceled or fails, and clears only on confirmed success', async () => {
  jest.mocked(clearHistory).mockRejectedValueOnce(new Error('disk')).mockResolvedValueOnce();
  await render(<HistoryScreen />);
  await waitFor(() => expect(screen.getByText(entry.product.name)).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: ro.history.clear }));
  await fireEvent.press(screen.getByRole('button', { name: ro.app.cancel }));
  expect(clearHistory).not.toHaveBeenCalled();
  expect(screen.getByText(entry.product.name)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.history.clear }));
  await fireEvent.press(screen.getByRole('button', { name: ro.history.clearConfirm }));
  await waitFor(() => expect(screen.getByText(ro.history.clearError)).toBeTruthy());
  expect(screen.getByText(entry.product.name)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.history.clearConfirm }));
  await waitFor(() => expect(screen.getByText(ro.history.design.emptyTitle)).toBeTruthy());
  expect(screen.queryByText(entry.product.name)).toBeNull();
});
it('refreshes on focus and ignores older reads', async () => {
  const oldRead = deferred<HistoryEntry[]>();
  const newRead = deferred<HistoryEntry[]>();
  const updated = { ...entry, product: { ...entry.product, name: 'Etichetă actualizată' } };
  await render(<HistoryScreen />);
  await waitFor(() => expect(screen.getByText(entry.product.name)).toBeTruthy());
  jest.mocked(listHistory).mockReturnValueOnce(oldRead.promise).mockReturnValueOnce(newRead.promise);
  await refocus();
  await refocus();
  await act(() => newRead.resolve([updated]));
  await act(() => oldRead.resolve([]));
  expect(screen.getByText(updated.product.name)).toBeTruthy();
  expect(screen.queryByText(ro.history.design.emptyTitle)).toBeNull();
});
it('retains saved rows when a focus refresh fails', async () => {
  await render(<HistoryScreen />);
  await waitFor(() => expect(screen.getByText(entry.product.name)).toBeTruthy());
  jest.mocked(listHistory).mockRejectedValueOnce(new Error('disk'));
  await refocus();
  await waitFor(() => expect(screen.getByText(ro.history.loadError)).toBeTruthy());
  expect(screen.getByText(entry.product.name)).toBeTruthy();
});
it('does not restore deleted rows when an earlier read finishes after clear', async () => {
  const pending = deferred<HistoryEntry[]>();
  await render(<HistoryScreen />);
  await waitFor(() => expect(screen.getByText(entry.product.name)).toBeTruthy());
  jest.mocked(listHistory).mockReturnValueOnce(pending.promise);
  await refocus();
  await fireEvent.press(screen.getByRole('button', { name: ro.history.clear }));
  await fireEvent.press(screen.getByRole('button', { name: ro.history.clearConfirm }));
  await waitFor(() => expect(screen.getByText(ro.history.design.emptyTitle)).toBeTruthy());
  await act(() => pending.resolve([entry]));
  expect(screen.queryByText(entry.product.name)).toBeNull();
});

it('withholds a cached score when required nutrition data is missing', async () => {
  jest.mocked(listHistory).mockResolvedValue([{ ...entry, product: { ...entry.product, nutrients: { ...entry.product.nutrients, salt: null } } }]);
  await render(<HistoryScreen />);
  await waitFor(() => expect(screen.getByText(ro.result.scoreUnavailable)).toBeTruthy());
  expect(screen.queryByText(ro.history.score(entry.score.score!))).toBeNull();
});
