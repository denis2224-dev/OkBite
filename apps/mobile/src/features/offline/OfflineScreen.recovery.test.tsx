import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { OfflineScreen } from './OfflineScreen';
import { flushQueue, subscribeQueueResults, listQueue, retryQueued, resumeQueuedItem, type QueueResult } from './queue';
import { identifyCandidates, identifyFound, identifyNotFound, PRODUCT_ID } from '../capture/__fixtures__/responses';
import { ro } from '../../copy/ro';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { replace: (href: unknown) => mockReplace(href), push: jest.fn() } }));
jest.mock('./queue', () => ({ flushQueue: jest.fn(), subscribeQueueResults: jest.fn(), listQueue: jest.fn(), retryQueued: jest.fn(), resumeQueuedItem: jest.fn(), completeQueued: jest.fn(), subscribeQueue: () => jest.fn() }));
jest.mock('../history/db', () => ({ listQueued: jest.fn(async () => []) }));
jest.mock('../../ui/Screen', () => ({ Screen: ({ children }: { children: React.ReactNode }) => children }));
let receive: ((event: QueueResult) => boolean) | undefined;
beforeEach(() => {
  jest.clearAllMocks();
  receive = undefined;
  jest.mocked(flushQueue).mockResolvedValue({ resolved: 0 });
  jest.mocked(listQueue).mockResolvedValue([]);
  jest.mocked(subscribeQueueResults).mockImplementation(listener => { receive = listener; return jest.fn(); });
});
it.each([identifyFound, identifyCandidates, identifyNotFound])('opens the selected $status destination without redirecting on queue entry', async (response) => {
  const item = { id: 'queued', kind: 'photo' as const, payload: 'saved.jpg', createdAt: '2026-11-05T10:00:00Z', status: 'needs_review' as const, outcome: identifyCandidates };
  jest.mocked(listQueue).mockResolvedValue([item as never]);
  jest.mocked(resumeQueuedItem).mockResolvedValue(response.status === 'found' ? { kind: 'found', productId: PRODUCT_ID }
    : { kind: 'identify', pathname: '/identify', params: { source: 'photo', payload: JSON.stringify(response), queueId: item.id } });
  await render(<OfflineScreen />);
  expect(mockReplace).not.toHaveBeenCalled();
  expect(flushQueue).not.toHaveBeenCalled();
  await fireEvent.press(await screen.findByRole('button', { name: ro.app.open }));
  const target = response.status === 'found' ? `/product/${PRODUCT_ID}`
    : { pathname: '/identify', params: { source: 'photo', payload: JSON.stringify(response), queueId: 'queued' } };
  expect(mockReplace).toHaveBeenCalledWith(target);
  expect(mockReplace).toHaveBeenCalledTimes(1);
});
it('does not navigate away from History when a background result arrives', async () => {
  await render(<OfflineScreen />);
  await fireEvent.press(screen.getByRole('button', { name: ro.offline.history }));
  await act(() => { receive?.({ item: { id: 'q', kind: 'photo', payload: 'saved.jpg' }, result: identifyCandidates }); });
  expect(mockReplace).not.toHaveBeenCalled();
});
it('shows a retryable error when queue storage cannot be read', async () => {
  jest.mocked(listQueue).mockResolvedValue([{ id: 'q', kind: 'code', payload: '12345670', createdAt: '2026-11-05T10:00:00Z', status: 'pending' }]);
  await render(<OfflineScreen />);
  jest.mocked(retryQueued).mockImplementation(() => flushQueue());
  jest.mocked(flushQueue).mockRejectedValueOnce(new Error('disk'));
  await fireEvent.press(screen.getByRole('button', { name: ro.offline.retry }));
  expect(screen.getByText(ro.offline.queueError)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.offline.retry }));
  expect(screen.queryByText(ro.offline.queueError)).toBeNull();
});
