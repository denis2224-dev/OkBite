import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

export function subscribeReconnect(retry: () => void): () => void {
  const stopNetwork = NetInfo.addEventListener(state => {
    if (state.isConnected && state.isInternetReachable !== false) retry();
  });
  const foreground = AppState.addEventListener('change', state => {
    if (state === 'active') retry();
  });
  return () => { stopNetwork(); foreground.remove(); };
}
