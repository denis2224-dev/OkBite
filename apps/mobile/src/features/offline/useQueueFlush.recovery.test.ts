import { act, renderHook } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { flushQueue } from './queue';
import { useQueueFlush } from './useQueueFlush';
import { ro } from '../../copy/ro';

const mockToast = jest.fn();
jest.mock('../../ui/Toast', () => ({ useToast: () => mockToast }));
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: jest.fn(), fetch: jest.fn(async () => ({ isConnected: false })) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('./queue', () => ({ flushQueue: jest.fn(), subscribeQueue: () => jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
});
it('flushes on reconnect, reports results and removes its single app subscription', async () => {
  let reconnect!: () => void;
  const stop = jest.fn();
  jest.mocked(NetInfo.addEventListener).mockImplementation(listener => { reconnect = () => listener({ isConnected: true, isInternetReachable: true } as never); return stop; });
  jest.mocked(flushQueue).mockImplementationOnce(async resolved => { resolved?.('p'); return { resolved: 1 }; }).mockRejectedValueOnce(new Error('storage'));
  const hook = await renderHook(() => useQueueFlush());
  await act(async () => { reconnect(); });
  expect(mockToast).toHaveBeenCalledWith(ro.offline.resolved(1), expect.objectContaining({ label: ro.app.open }));
  await act(async () => { reconnect(); });
  expect(mockToast).toHaveBeenCalledWith(ro.offline.queueError);
  await hook.rerender(undefined);
  expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
  await hook.unmount();
  expect(stop).toHaveBeenCalledTimes(1);
});

it('retries an enqueue that commits after reconnect without another network transition', async () => {
  let reconnect!: () => void;
  let queueListener!: (event: string) => void;
  jest.mocked(NetInfo.addEventListener).mockImplementation(listener => {
    reconnect = () => listener({ isConnected: true, isInternetReachable: true } as never);
    return jest.fn();
  });
  const mockSubscribeQueue = jest.fn((listener: (event: string) => void) => {
    queueListener = listener;
    return jest.fn();
  });
  const queueModule = jest.requireMock('./queue') as { subscribeQueue: typeof mockSubscribeQueue; flushQueue: jest.Mock };
  queueModule.subscribeQueue = mockSubscribeQueue;
  queueModule.flushQueue.mockResolvedValue({ resolved: 0 });

  const hook = await renderHook(() => useQueueFlush());

  // 1. Reconnect occurs and flush finishes (queue was empty at this point)
  await act(async () => { reconnect(); });
  expect(queueModule.flushQueue).toHaveBeenCalledTimes(1);

  // 2. Photo copy and queue write commit after reconnect pass finished
  await act(async () => {
    queueListener('enqueued');
  });

  // The saved item must process without another network transition!
  expect(queueModule.flushQueue).toHaveBeenCalledTimes(2);

  await hook.unmount();
});

it('re-runs flush once when reconnect arrives during a drain that subsequently fails offline, without looping', async () => {
  let reconnect!: () => void;
  jest.mocked(NetInfo.addEventListener).mockImplementation(listener => {
    reconnect = () => listener({ isConnected: true, isInternetReachable: true } as never);
    return jest.fn();
  });
  const queueModule = jest.requireMock('./queue') as { flushQueue: jest.Mock };

  let finishFirstDrain!: (err?: Error) => void;
  const firstDrainPromise = new Promise<{ resolved: number }>((resolve, reject) => {
    finishFirstDrain = (err) => err ? reject(err) : resolve({ resolved: 0 });
  });

  // First flushQueue call is in flight
  queueModule.flushQueue.mockReturnValueOnce(firstDrainPromise);

  const hook = await renderHook(() => useQueueFlush());

  // Trigger first drain
  await act(async () => { reconnect(); });
  expect(queueModule.flushQueue).toHaveBeenCalledTimes(1);

  // While first drain is in flight, another reconnect arrives
  await act(async () => { reconnect(); });
  // Still 1 call because first drain is running
  expect(queueModule.flushQueue).toHaveBeenCalledTimes(1);

  // Set up second drain resolution (e.g. fails offline)
  queueModule.flushQueue.mockRejectedValueOnce(new Error('offline'));

  // First drain subsequently fails offline
  await act(async () => {
    finishFirstDrain(new Error('offline'));
  });

  // Reconnect that arrived during in-flight drain triggers a second drain!
  expect(queueModule.flushQueue).toHaveBeenCalledTimes(2);

  // But when the second drain fails, it must NOT loop indefinitely!
  await act(async () => {});
  expect(queueModule.flushQueue).toHaveBeenCalledTimes(2);

  await hook.unmount();
});
