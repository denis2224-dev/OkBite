import { fireEvent, render, screen } from '@testing-library/react-native';
import History from '../../../app/(tabs)/history';
import { listHistory } from './store';
import { listQueued } from './db';
import { subscribeQueueResults } from '../offline/queue';
import { lookupFound, PRODUCT_ID } from '../capture/__fixtures__/responses';
import { ro } from '../../copy/ro';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useFocusEffect: (effect: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]),
}));
jest.mock('./store', () => ({ listHistory: jest.fn() }));
jest.mock('./db', () => ({ listQueued: jest.fn() }));
jest.mock('../offline/queue', () => ({ subscribeQueueResults: jest.fn(() => jest.fn()) }));
jest.mock('../../ui/Screen', () => ({ Screen: ({ children }: { children: React.ReactNode }) => children }));
it('opens saved results and offers a path back to pending photos', async () => {
  if (lookupFound.status !== 'found') throw new Error('Expected a complete found fixture');
  jest.mocked(listHistory).mockResolvedValue([{ ...lookupFound, savedAt: '2026-11-05T10:00:00.000Z' }]);
  jest.mocked(listQueued).mockResolvedValue([{ id: 'a', kind: 'photo', payload: 'saved.jpg', createdAt: '2026-11-05T10:00:00.000Z' }]);
  await render(<History />);
  const product = await screen.findByRole('button', { name: ro.history.open(lookupFound.product.name) });
  await fireEvent.press(product);
  expect(mockReplace).toHaveBeenCalledWith(`/product/${PRODUCT_ID}`);
  await fireEvent.press(screen.getByRole('button', { name: ro.offline.retry }));
  expect(mockReplace).toHaveBeenCalledWith('/offline');
  expect(subscribeQueueResults).toHaveBeenCalled();
});
