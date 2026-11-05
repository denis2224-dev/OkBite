import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { OfflineScreen } from './OfflineScreen';
import { flushQueue, subscribeQueueResults, listQueue, retryQueued, resumeQueuedItem, type QueueResult } from './queue';
import { identifyCandidates, identifyFound, identifyNotFound, PRODUCT_ID } from '../capture/__fixtures__/responses';
import { ro } from '../../copy/ro';

const mockReplace = jest.fn();
let mockFocusCleanup: (() => void) | undefined;
let mockFocusCallback: (() => void) | undefined;
const mockPush = jest.fn((_href?: unknown) => {
  mockFocusCleanup?.();
  mockFocusCleanup = undefined;
});
jest.mock('expo-router', () => ({
  router: { replace: (href: unknown) => mockReplace(href), push: (href: unknown) => mockPush(href) },
  useFocusEffect: (cb: () => (() => void) | void) => {
    mockFocusCallback = () => {
      mockFocusCleanup?.();
      mockFocusCleanup = cb() || undefined;
    };
    jest.requireActual<typeof import('react')>('react').useEffect(() => {
      mockFocusCallback?.();
      return () => { mockFocusCleanup?.(); };
    }, [cb]);
  },
}));
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
afterEach(() => { cleanup(); });
it('shows a completion action without exposing its internal receipt ID as a barcode', async () => {
  const id = '0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e1f';
  jest.mocked(listQueue).mockResolvedValue([{ id, kind: 'code', payload: id,
    createdAt: '2026-11-05T10:00:00Z', status: 'completed' }]);
  await render(<OfflineScreen />);
  expect(screen.queryByText(id)).toBeNull();
  expect(screen.getByText(ro.review.finishSave)).toBeTruthy();
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

it('does not override navigation if the shopper leaves for History before Open finishes', async () => {
  const item = { id: 'queued-1', kind: 'photo' as const, payload: 'saved.jpg', createdAt: '2026-11-05T10:00:00Z', status: 'needs_review' as const, outcome: identifyCandidates };
  jest.mocked(listQueue).mockResolvedValue([item as never]);
  let finishResume!: () => void;
  jest.mocked(resumeQueuedItem).mockReturnValue(new Promise(resolve => {
    finishResume = () => resolve({ kind: 'identify', pathname: '/identify', params: { source: 'photo', payload: JSON.stringify(identifyCandidates), queueId: item.id } });
  }));

  const view = await render(<OfflineScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: ro.app.open }));
  expect(resumeQueuedItem).toHaveBeenCalledWith(item);

  // Shopper navigates away (component unmounts)
  view.unmount();

  // Open finishes after shopper left
  act(() => {
    finishResume();
  });

  expect(mockReplace).not.toHaveBeenCalled();
});

it('does not override navigation if the shopper presses History before Open finishes without unmounting', async () => {
  const item = { id: 'queued-2', kind: 'photo' as const, payload: 'saved.jpg', createdAt: '2026-11-05T10:00:00Z', status: 'needs_review' as const, outcome: identifyCandidates };
  jest.mocked(listQueue).mockResolvedValue([item as never]);
  let finishResume!: () => void;
  jest.mocked(resumeQueuedItem).mockReturnValue(new Promise(resolve => {
    finishResume = () => resolve({ kind: 'identify', pathname: '/identify', params: { source: 'photo', payload: JSON.stringify(identifyCandidates), queueId: item.id } });
  }));

  const view = await render(<OfflineScreen />);
  await fireEvent.press(await view.findByRole('button', { name: ro.app.open }));
  expect(resumeQueuedItem).toHaveBeenCalledWith(item);

  // Shopper presses History (does not unmount OfflineScreen)
  await fireEvent.press(screen.getByRole('button', { name: ro.offline.history }));

  // Open finishes after History was pressed
  await act(async () => {
    finishResume();
    await Promise.resolve();
  });

  expect(mockReplace).not.toHaveBeenCalled();
});

it('ignores old Open action after leaving for History, and opens review when shopper returns and presses Open again', async () => {
  const item = { id: 'queued-3', kind: 'photo' as const, payload: 'saved.jpg', createdAt: '2026-11-05T10:00:00Z', status: 'needs_review' as const, outcome: identifyCandidates };
  jest.mocked(listQueue).mockResolvedValue([item as never]);
  let finishOldResume!: () => void;
  let finishNewResume!: () => void;

  jest.mocked(resumeQueuedItem)
    .mockImplementationOnce(() => new Promise(resolve => {
      finishOldResume = () => resolve({ kind: 'identify', pathname: '/identify', params: { source: 'photo', payload: JSON.stringify(identifyCandidates), queueId: item.id } });
    }))
    .mockImplementationOnce(() => new Promise(resolve => {
      finishNewResume = () => resolve({ kind: 'identify', pathname: '/identify', params: { source: 'photo', payload: JSON.stringify(identifyCandidates), queueId: item.id } });
    }));

  const view = await render(<OfflineScreen />);

  // 1. Deschide
  await fireEvent.press(await view.findByRole('button', { name: ro.app.open }));
  expect(resumeQueuedItem).toHaveBeenCalledTimes(1);

  // 2. Istoric (OfflineScreen loses focus)
  await fireEvent.press(view.getByRole('button', { name: ro.offline.history }));

  // 3. Se rezolvă acțiunea veche
  await act(async () => {
    finishOldResume();
    await Promise.resolve();
  });
  expect(mockReplace).not.toHaveBeenCalled();

  // 4. Înapoi (OfflineScreen regains focus, still mounted)
  await act(async () => {
    mockFocusCallback?.();
    await Promise.resolve();
  });

  // 5. Deschide din nou
  await fireEvent.press(view.getByRole('button', { name: ro.app.open }));
  expect(resumeQueuedItem).toHaveBeenCalledTimes(2);

  // 6. Se rezolvă acțiunea nouă
  await act(async () => {
    finishNewResume();
    await Promise.resolve();
  });

  // Acțiunea nouă deschide review-ul!
  expect(mockReplace).toHaveBeenCalledWith({
    pathname: '/identify',
    params: { source: 'photo', payload: JSON.stringify(identifyCandidates), queueId: item.id },
  });
  expect(mockReplace).toHaveBeenCalledTimes(1);
});
