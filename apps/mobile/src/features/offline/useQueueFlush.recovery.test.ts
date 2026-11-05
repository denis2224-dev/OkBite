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
