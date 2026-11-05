import { act, fireEvent, render, screen } from '@testing-library/react-native';
import OfflineScreen from './OfflineScreen';
import { flushQueue, subscribeQueueResults, type QueueResult } from './queue';
import { identifyCandidates, identifyFound, identifyNotFound, PRODUCT_ID } from '../capture/__fixtures__/responses';
import { ro } from '../../copy/ro';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('./queue', () => ({ flushQueue: jest.fn(), subscribeQueueResults: jest.fn() }));
jest.mock('../history/db', () => ({ listQueued: jest.fn(async () => []) }));
jest.mock('../../ui/Screen', () => ({ Screen: ({ children }: { children: React.ReactNode }) => children }));
let receive!: (event: QueueResult) => boolean;
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(flushQueue).mockResolvedValue({ resolved: 0 });
  jest.mocked(subscribeQueueResults).mockImplementation(listener => { receive = listener; return jest.fn(); });
});
it.each([identifyFound, identifyCandidates, identifyNotFound])('opens the $status destination once after a queued photo resolves', async (response) => {
  const item = { id: 'queued', kind: 'photo' as const, payload: 'saved.jpg', createdAt: '2026-11-05T10:00:00Z' };
  await render(<OfflineScreen />);
  await act(() => { expect(receive({ item, result: response })).toBe(true); });
  const target = response.status === 'found' ? `/product/${PRODUCT_ID}`
    : { pathname: '/identify', params: { source: 'photo', payload: JSON.stringify(response) } };
  expect(mockReplace).toHaveBeenCalledWith(target);
  await act(() => { expect(receive({ item, result: response })).toBe(false); });
  expect(mockReplace).toHaveBeenCalledTimes(1);
});
it('shows a retryable error when queue storage cannot be read', async () => {
  await render(<OfflineScreen />);
  jest.mocked(flushQueue).mockRejectedValueOnce(new Error('disk'));
  await fireEvent.press(screen.getByRole('button', { name: ro.offline.retry }));
  expect(screen.getByText(ro.offline.queueError)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.offline.retry }));
  expect(screen.queryByText(ro.offline.queueError)).toBeNull();
});
