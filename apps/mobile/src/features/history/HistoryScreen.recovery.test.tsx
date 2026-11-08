import { fireEvent, render, screen } from '@testing-library/react-native';
import History from '../../../app/(tabs)/history';
import { listHistory } from './store';
import { subscribeQueue } from '../offline/queue';
import { lookupFound, PRODUCT_ID } from '../capture/__fixtures__/responses';
import { ro } from '../../copy/ro';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  router: { push: (href: unknown) => mockReplace(href) },
  useFocusEffect: (effect: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]),
}));
jest.mock('./store', () => ({ listHistory: jest.fn() }));
jest.mock('../offline/queue', () => ({ subscribeQueue: jest.fn(() => jest.fn()) }));
jest.mock('../../ui/Screen', () => ({ Screen: ({ children }: { children: React.ReactNode }) => children }));
it('opens saved results and offers a path back to pending photos', async () => {
  if (lookupFound.status !== 'found') throw new Error('Expected a complete found fixture');
  jest.mocked(listHistory).mockResolvedValue([{ ...lookupFound, savedAt: '2026-11-05T10:00:00.000Z' }]);
  await render(<History />);
  const product = await screen.findByRole('button', { name: new RegExp(ro.history.open(lookupFound.product.name)) });
  await fireEvent.press(product);
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/product/[id]', params: { id: PRODUCT_ID, cached: '1' } });
  await fireEvent.press(screen.getByRole('button', { name: ro.offline.queueTitle }));
  expect(mockReplace).toHaveBeenCalledWith('/offline');
  expect(subscribeQueue).toHaveBeenCalled();
});
