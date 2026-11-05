import { act, renderHook } from '@testing-library/react-native';
import { subscribeReconnect } from './connectivity';
import { flushQueue } from './queue';
import { useQueueFlush } from './useQueueFlush';
import { ro } from '../../copy/ro';

const mockToast = jest.fn();
jest.mock('../../ui/Toast', () => ({ useToast: () => mockToast }));
jest.mock('./connectivity', () => ({ subscribeReconnect: jest.fn() }));
jest.mock('./queue', () => ({ flushQueue: jest.fn() }));
it('flushes on reconnect, reports results and removes its single app subscription', async () => {
  let reconnect!: () => void;
  const stop = jest.fn();
  jest.mocked(subscribeReconnect).mockImplementation(listener => { reconnect = listener; return stop; });
  jest.mocked(flushQueue).mockResolvedValueOnce({ resolved: 1 }).mockRejectedValueOnce(new Error('storage'));
  const hook = await renderHook(() => useQueueFlush());
  await act(async () => { reconnect(); });
  expect(mockToast).toHaveBeenCalledWith(ro.offline.resolved(1));
  await act(async () => { reconnect(); });
  expect(mockToast).toHaveBeenCalledWith(ro.offline.queueError);
  await hook.rerender(undefined);
  expect(subscribeReconnect).toHaveBeenCalledTimes(1);
  await hook.unmount();
  expect(stop).toHaveBeenCalledTimes(1);
});
