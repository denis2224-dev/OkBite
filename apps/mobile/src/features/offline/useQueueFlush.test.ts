import { renderHook, act, waitFor } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { router } from 'expo-router';
import { ro } from '../../copy/ro';
import { AppState, type AppStateStatus } from 'react-native';
import { flushQueue } from './queue';
import { useQueueFlush } from './useQueueFlush';
const mockToast = jest.fn();
let mockNetwork: (state: { isConnected: boolean; isInternetReachable: boolean }) => void;
const mockUnsubscribe = jest.fn();
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(listener => { mockNetwork = listener; return mockUnsubscribe; }),
  fetch: jest.fn(),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('./queue', () => ({ flushQueue: jest.fn(), subscribeQueue: () => jest.fn() }));
jest.mock('../../ui/Toast', () => ({ useToast: () => mockToast }));
beforeEach(() => { jest.clearAllMocks(); jest.mocked(flushQueue).mockResolvedValue({ resolved: 0 }); });
it('flushes only reachable connections and unsubscribes when disposed', async () => {
  jest.mocked(NetInfo.fetch).mockResolvedValue({ isConnected: false } as never);
  const { unmount } = await renderHook(() => useQueueFlush());
  expect(flushQueue).not.toHaveBeenCalled();
  await act(() => mockNetwork({ isConnected: true, isInternetReachable: false }));
  expect(flushQueue).not.toHaveBeenCalled();
  await act(() => mockNetwork({ isConnected: true, isInternetReachable: true }));
  await waitFor(() => expect(flushQueue).toHaveBeenCalledTimes(1));
  await unmount(); expect(mockUnsubscribe).toHaveBeenCalled();
});
it('checks connectivity when foregrounded and reports storage failures', async () => {
  let activate!: (state: AppStateStatus) => void;
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => { activate = listener; return { remove }; });
  jest.mocked(NetInfo.fetch).mockResolvedValue({ isConnected: false } as never);
  const view = await renderHook(() => useQueueFlush());
  jest.mocked(NetInfo.fetch).mockResolvedValue({ isConnected: true, isInternetReachable: true } as never);
  jest.mocked(flushQueue).mockRejectedValueOnce(new Error('storage'));
  await act(() => activate('active'));
  await waitFor(() => expect(mockToast).toHaveBeenCalled());
  await view.unmount(); expect(remove).toHaveBeenCalled();
  jest.restoreAllMocks();
});

it('offers navigation to an actually resolved product', async () => {
  const id = '00000000-0000-4000-8000-000000000001';
  jest.mocked(NetInfo.fetch).mockResolvedValue({ isConnected: true, isInternetReachable: true } as never);
  jest.mocked(flushQueue).mockImplementationOnce(async resolved => { resolved?.(id); return { resolved: 1 }; });
  await renderHook(() => useQueueFlush());
  await waitFor(() => expect(mockToast).toHaveBeenCalledWith(ro.offline.resolved(1), expect.objectContaining({ label: ro.app.open })));
  const action = mockToast.mock.calls.find(([message]) => message === ro.offline.resolved(1))![1];
  action.onPress();
  expect(router.push).toHaveBeenCalledWith(`/product/${id}`);
});
