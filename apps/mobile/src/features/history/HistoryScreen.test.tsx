import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { HistoryScreen } from './HistoryScreen';
import { clearHistory, listHistory, removeFromHistory, type HistoryEntry } from './store';
import { foundYogurt } from '../../test/fixtures';
import { ro } from '../../copy/ro';
import { productScoreFor } from '../product/productScoreFor';

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
jest.mock('./store', () => ({ listHistory: jest.fn(), clearHistory: jest.fn(), removeFromHistory: jest.fn(), restoreToHistory: jest.fn() }));
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
const openName = (name: string) => new RegExp(ro.history.open(name));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(listHistory).mockResolvedValue([entry]);
  jest.mocked(clearHistory).mockResolvedValue();
});
it.each(['verified', 'unverified'] as const)('keeps the row short and still announces score context and %s status', async (status) => {
  const product = { ...entry.product, status, verifiedAt: status === 'verified' ? '2026-11-06' : null };
  jest.mocked(listHistory).mockResolvedValue([{ ...entry, product }]);
  await render(<HistoryScreen />);
  await screen.findByRole('button', { name: openName(product.name) });
  const verification = status === 'verified' ? `${ro.result.checked}: 06.11.2026` : ro.result.unverified;
  expect(screen.queryByText(verification)).toBeNull(); // kept short on screen, read aloud below
  expect(screen.queryByText(ro.score.disclaimer)).toBeNull(); // not printed under the list; the spoken label still has it
  const row = screen.getByRole('button', { name: new RegExp(ro.history.open(product.name)) });
  expect(row.props.accessibilityLabel).toContain(product.brand);
  expect(row.props.accessibilityLabel).toContain(ro.history.score(productScoreFor(entry.product, entry.score).score!));
  expect(row.props.accessibilityLabel).toContain('86 din 100 · Excelent'); // same number as the result
  expect(row.props.accessibilityLabel).toContain(product.source);
  expect(row.props.accessibilityLabel).toContain(verification);
  expect(row.props.accessibilityLabel).toContain(ro.score.disclaimer);
});
it('opens a clear confirmation dialog even with a long history', async () => {
  jest.mocked(listHistory).mockResolvedValue(Array.from({ length: 30 }, (_, index) => ({ ...entry, product: { ...entry.product, id: `record-${index}`, name: `Produs ${index}` } })));
  await render(<HistoryScreen />);
  await screen.findByRole('button', { name: openName('Produs 29') });
  await fireEvent.press(screen.getByRole('button', { name: ro.history.clear }));
  const dialog = screen.getByLabelText(ro.history.clearTitle);
  expect(dialog.props.accessibilityViewIsModal).toBe(true);
  await fireEvent.press(within(dialog).getByRole('button', { name: ro.app.cancel }));
  expect(screen.queryByLabelText(ro.history.clearTitle)).toBeNull();
  expect(clearHistory).not.toHaveBeenCalled();
});
it('shows no "saved only in this browser" banner above the list', async () => {
  await render(<HistoryScreen />);
  await screen.findByRole('button', { name: openName(entry.product.name) });
  expect(screen.queryByText('Istoricul e salvat doar în acest browser.')).toBeNull();
});
it('has no search field, with or without products', async () => {
  await render(<HistoryScreen />);
  await screen.findByRole('button', { name: openName(entry.product.name) });
  expect(screen.queryByLabelText(ro.history.search)).toBeNull();
  jest.mocked(listHistory).mockResolvedValue([]);
  await refocus();
  await screen.findByText(ro.history.design.emptyTitle);
  expect(screen.queryByLabelText(ro.history.search)).toBeNull();
  expect(screen.getByText(ro.history.design.empty)).toBeTruthy();
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
  await waitFor(() => expect(screen.getByRole('button', { name: openName(entry.product.name) })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(ro.history.open(entry.product.name)) }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/product/[id]', params: { id: entry.product.id, cached: '1' } });
});
it('announces source dates and marks an unavailable score as fără scor without inventing zero', async () => {
  jest.mocked(listHistory).mockResolvedValue([{ ...entry, score: { ...entry.score, score: null, grade: 'unavailable' } }]);
  await render(<HistoryScreen />);
  const row = await screen.findByRole('button', { name: new RegExp(ro.history.open(entry.product.name)) });
  expect(row.props.accessibilityLabel).toContain(entry.product.source);
  expect(row.props.accessibilityLabel).toContain(`${ro.result.added}: ${entry.product.addedAt.split('-').reverse().join('.')}`);
  expect(row.props.accessibilityLabel).toContain(ro.result.scoreUnavailable);
  expect(screen.getByText(ro.history.noScore)).toBeTruthy();
  expect(screen.queryByText('0 din 100')).toBeNull();
});
it('keeps the list when deletion is canceled or fails, and clears only on confirmed success', async () => {
  jest.mocked(clearHistory).mockRejectedValueOnce(new Error('disk')).mockResolvedValueOnce();
  await render(<HistoryScreen />);
  await waitFor(() => expect(screen.getByRole('button', { name: openName(entry.product.name) })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: ro.history.clear }));
  await fireEvent.press(screen.getByRole('button', { name: ro.app.cancel }));
  expect(clearHistory).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: openName(entry.product.name) })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.history.clear }));
  await fireEvent.press(screen.getByRole('button', { name: ro.history.clearConfirm }));
  await waitFor(() => expect(screen.getByText(ro.history.clearError)).toBeTruthy());
  expect(screen.getByRole('button', { name: openName(entry.product.name) })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.history.clearConfirm }));
  await waitFor(() => expect(screen.getByText(ro.history.design.emptyTitle)).toBeTruthy());
  expect(screen.queryByRole('button', { name: openName(entry.product.name) })).toBeNull();
});
it('refreshes on focus and ignores older reads', async () => {
  const oldRead = deferred<HistoryEntry[]>();
  const newRead = deferred<HistoryEntry[]>();
  const updated = { ...entry, product: { ...entry.product, name: 'Etichetă actualizată' } };
  await render(<HistoryScreen />);
  await waitFor(() => expect(screen.getByRole('button', { name: openName(entry.product.name) })).toBeTruthy());
  jest.mocked(listHistory).mockReturnValueOnce(oldRead.promise).mockReturnValueOnce(newRead.promise);
  await refocus();
  await refocus();
  await act(() => newRead.resolve([updated]));
  await act(() => oldRead.resolve([]));
  expect(screen.getByRole('button', { name: openName(updated.product.name) })).toBeTruthy();
  expect(screen.queryByText(ro.history.design.emptyTitle)).toBeNull();
});
it('retains saved rows when a focus refresh fails', async () => {
  await render(<HistoryScreen />);
  await waitFor(() => expect(screen.getByRole('button', { name: openName(entry.product.name) })).toBeTruthy());
  jest.mocked(listHistory).mockRejectedValueOnce(new Error('disk'));
  await refocus();
  await waitFor(() => expect(screen.getByText(ro.history.loadError)).toBeTruthy());
  expect(screen.getByRole('button', { name: openName(entry.product.name) })).toBeTruthy();
});
it('does not restore deleted rows when an earlier read finishes after clear', async () => {
  const pending = deferred<HistoryEntry[]>();
  await render(<HistoryScreen />);
  await waitFor(() => expect(screen.getByRole('button', { name: openName(entry.product.name) })).toBeTruthy());
  jest.mocked(listHistory).mockReturnValueOnce(pending.promise);
  await refocus();
  await fireEvent.press(screen.getByRole('button', { name: ro.history.clear }));
  await fireEvent.press(screen.getByRole('button', { name: ro.history.clearConfirm }));
  await waitFor(() => expect(screen.getByText(ro.history.design.emptyTitle)).toBeTruthy());
  await act(() => pending.resolve([entry]));
  expect(screen.queryByRole('button', { name: openName(entry.product.name) })).toBeNull();
});

it('withholds a cached score when required nutrition data is missing', async () => {
  jest.mocked(listHistory).mockResolvedValue([{ ...entry, product: { ...entry.product, nutrients: { ...entry.product.nutrients, salt: null } } }]);
  await render(<HistoryScreen />);
  await waitFor(() => expect(screen.getByText(ro.history.noScore)).toBeTruthy());
  expect(screen.getByRole('button', { name: new RegExp(ro.result.scoreUnavailable) })).toBeTruthy();
  expect(screen.queryByText(/^\d+ · /)).toBeNull();
  expect(screen.queryByText(String(productScoreFor(entry.product, entry.score).score), { includeHiddenElements: true })).toBeNull();
});

it('renders only the title in the shared tab page header, with no filler subtitle', async () => {
  await render(<HistoryScreen />);
  await screen.findByRole('button', { name: openName(entry.product.name) });
  const title = screen.getByRole('header', { name: ro.history.design.title });
  expect(StyleSheet.flatten(title.props.style).fontSize).toBe(22);
  expect(screen.queryByText('Disponibil și fără internet.')).toBeNull();
  expect(screen.queryByTestId('tab-page-subtitle')).toBeNull();
});

it('has no basket summary card, with or without products', async () => {
  await render(<HistoryScreen />);
  await screen.findByRole('button', { name: openName(entry.product.name) });
  expect(screen.queryByRole('header', { name: ro.history.basket.title })).toBeNull();
  jest.mocked(listHistory).mockResolvedValue([]);
  await refocus();
  await screen.findByText(ro.history.design.emptyTitle);
  expect(screen.queryByRole('header', { name: ro.history.basket.title })).toBeNull();
});

it('draws each row as photo on the left, with the rating and the verdict under it, and nothing else', async () => {
  const now = new Date();
  const withPhoto = { ...entry, savedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 5).toISOString(), product: { ...entry.product, imageUrl: 'https://example.com/product.jpg' } };
  jest.mocked(listHistory).mockResolvedValue([withPhoto]);
  await render(<HistoryScreen />);
  const row = await screen.findByRole('button', { name: openName(entry.product.name) });
  const { score, tier } = productScoreFor(withPhoto.product, withPhoto.score);
  expect(within(row).getByTestId('history-photo').props.source).toEqual({ uri: 'https://example.com/product.jpg' });
  const rating = within(row).getByText(String(score), { includeHiddenElements: true });
  const verdict = within(row).getByText(ro.tiers[tier!], { includeHiddenElements: true });
  expect(rating).toBeTruthy();
  expect(verdict).toBeTruthy();
  // No name, brand, source or time on the row, and no marker before the verdict.
  expect(screen.queryByText(entry.product.name)).toBeNull();
  expect(screen.queryByText('Azi, 08:05')).toBeNull();
  expect(screen.queryByText(entry.product.source)).toBeNull();
  expect(screen.queryByText(entry.product.brand, { exact: false })).toBeNull();
  expect(screen.queryByText('·', { exact: false })).toBeNull();
  expect(screen.queryByTestId('history-list')).toBeTruthy();
  expect(screen.queryByRole('button', { name: ro.history.remove(entry.product.name) })).toBeNull();
});
it('keeps a neutral tile where there is no product photo', async () => {
  await render(<HistoryScreen />);
  const row = await screen.findByRole('button', { name: openName(entry.product.name) });
  expect(within(row).queryByTestId('history-photo')).toBeNull();
  expect(within(row).getByTestId('history-photo-tile')).toBeTruthy();
});
it('still deletes a row through the screen-reader delete action', async () => {
  jest.mocked(removeFromHistory).mockResolvedValue();
  await render(<HistoryScreen />);
  const row = await screen.findByRole('button', { name: new RegExp(ro.history.open(entry.product.name)) });
  expect(row.props.accessibilityActions).toEqual(expect.arrayContaining([{ name: 'delete', label: ro.history.remove(entry.product.name) }]));
  await fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
  await waitFor(() => expect(removeFromHistory).toHaveBeenCalledWith(entry.product.id));
});
