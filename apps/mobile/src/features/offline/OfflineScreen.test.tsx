import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { OfflineScreen } from './OfflineScreen';
import { listQueue, retryQueued, completeQueued } from './queue';
import { ro } from '../../copy/ro';
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));
jest.mock('./queue', () => ({ listQueue: jest.fn(), retryQueued: jest.fn(), completeQueued: jest.fn(), flushQueue: jest.fn(), subscribeQueue: () => jest.fn() }));
const queued = { id: 'queued', kind: 'code', payload: '4840001000014', createdAt: '2026-11-05T00:00:00.000Z', error: 'rate_limited' };
beforeEach(() => { jest.resetAllMocks(); jest.mocked(listQueue).mockResolvedValue([queued as never]); });
it('shows retained failures and retries the selected work explicitly', async () => {
  jest.mocked(retryQueued).mockRejectedValueOnce(new Error('storage'));
  await render(<OfflineScreen />);
  await waitFor(() => expect(screen.getByText(ro.errors.rate_limited)).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: ro.app.retry }));
  await waitFor(() => expect(retryQueued).toHaveBeenCalledWith('queued'));
  expect(screen.getByText(ro.offline.queueError)).toBeTruthy();
});
it('requires confirmation before releasing a queued capture', async () => {
  await render(<OfflineScreen />);
  await waitFor(() => expect(screen.getByText('4840001000014')).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: ro.offline.cancel }));
  expect(completeQueued).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: ro.app.cancel }));
  expect(completeQueued).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: ro.offline.cancel }));
  jest.mocked(listQueue).mockResolvedValue([]);
  await fireEvent.press(screen.getByRole('button', { name: ro.offline.removeConfirm }));
  await waitFor(() => expect(completeQueued).toHaveBeenCalledWith('queued'));
  await waitFor(() => expect(screen.getByText(ro.offline.emptyQueue)).toBeTruthy());
});

it('opens an unresolved result from storage without retrying or deleting the entry', async () => {
  jest.mocked(listQueue).mockResolvedValue([{
    id: queued.id, kind: 'code', payload: queued.payload, createdAt: queued.createdAt,
    status: 'needs_review', outcome: { status: 'not_found' },
  }]);
  await render(<OfflineScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: ro.app.open }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/identify', params: { queuedId: queued.id } });
  expect(retryQueued).not.toHaveBeenCalled();
  expect(completeQueued).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: ro.app.retry })).toBeNull();
});

it('finishes local cleanup and opens a contribution that was already saved', async () => {
  const productId = '0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e1f';
  jest.mocked(listQueue).mockResolvedValue([{
    id: queued.id, kind: 'code', payload: queued.payload, createdAt: queued.createdAt,
    status: 'needs_review', completedProductId: productId,
  }]);
  await render(<OfflineScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: ro.app.open }));
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith(`/product/${productId}`));
  expect(completeQueued).toHaveBeenCalledWith(queued.id);
  expect(retryQueued).not.toHaveBeenCalled();
});
