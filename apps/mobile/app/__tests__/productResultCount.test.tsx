import { render } from '@testing-library/react-native';
import ProductPage from '../product/[id]/index';
import { noteResultOpened } from '../../src/lib/installPrompt';
import { foundYogurt } from '../../src/test/fixtures';

jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ id: 'test' }), router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true } }));
jest.mock('../../src/features/profile/useProfile', () => ({ useProfile: () => ({ profile: { goals: [], allergens: [], avoid: [], onboarded: true } }) }));
jest.mock('../../src/lib/installPrompt', () => ({ noteResultOpened: jest.fn() }));
const mockState: { data: unknown } = { data: null };
jest.mock('../../src/features/product/useProduct', () => ({ useProduct: () => ({ data: mockState.data, error: null, loading: !mockState.data, storageError: false, cached: false, retry: jest.fn() }) }));

it('counts a product result toward the install invitation only once it has loaded', async () => {
  const view = await render(<ProductPage />);
  expect(noteResultOpened).not.toHaveBeenCalled();
  mockState.data = foundYogurt;
  await view.rerender(<ProductPage />);
  expect(noteResultOpened).toHaveBeenCalledWith(foundYogurt.product.id);
});
