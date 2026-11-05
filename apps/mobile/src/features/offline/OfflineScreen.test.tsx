import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { OfflineScreen } from './OfflineScreen';
import { listQueue, retryQueued, completeQueued } from './queue';
import { ro } from '../../copy/ro';
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
