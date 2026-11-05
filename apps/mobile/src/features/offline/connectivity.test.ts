import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';
import { subscribeReconnect } from './connectivity';

jest.mock('@react-native-community/netinfo', () => ({ __esModule: true, default: { addEventListener: jest.fn() } }));
it('retries on a reachable network and foreground, then removes both listeners', () => {
  let network!: (state: NetInfoState) => void;
  let foreground!: (state: AppStateStatus) => void;
  const stopNetwork = jest.fn(), remove = jest.fn(), retry = jest.fn();
  jest.mocked(NetInfo.addEventListener).mockImplementation((listener) => { network = listener; return stopNetwork; });
  const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    foreground = listener;
    return { remove };
  });
  const stop = subscribeReconnect(retry);
  network({ type: 'none', details: null, isConnected: false, isInternetReachable: false } as NetInfoState);
  network({ type: 'other', details: {}, isConnected: true, isInternetReachable: false } as NetInfoState);
  foreground('background');
  expect(retry).not.toHaveBeenCalled();
  network({ type: 'other', details: {}, isConnected: true, isInternetReachable: null } as NetInfoState);
  foreground('active');
  expect(retry).toHaveBeenCalledTimes(2);
  stop();
  expect(stopNetwork).toHaveBeenCalledTimes(1);
  expect(remove).toHaveBeenCalledTimes(1);
  spy.mockRestore();
});
