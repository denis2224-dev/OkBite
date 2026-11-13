import { render, screen } from '@testing-library/react-native';
import ProductPage from '../../../app/product/[id]/index';
import { ro } from '../../copy/ro';

jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ id: 'test' }), router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true } }));
jest.mock('../profile/useProfile', () => ({ useProfile: () => ({ profile: { goals: [], allergens: [], avoid: [], onboarded: true } }) }));
jest.mock('./useProduct', () => ({ useProduct: () => ({ data: jest.requireActual('../../test/fixtures').foundYogurt, error: null, loading: false, storageError: false, cached: false, retry: jest.fn() }) }));

it('keeps "Compară cu alt produs" fixed below the scrolling result', async () => {
  await render(<ProductPage />);
  expect(screen.getByRole('button', { name: ro.result.compare })).toBeTruthy();
  type Node = { type: string; children?: (Node | string)[] | null };
  const find = (node: Node | string): Node | undefined => typeof node === 'string' ? undefined
    : node.type === 'RCTScrollView' ? node : node.children?.map(find).find(Boolean);
  const scroll = find(screen.toJSON() as Node);
  expect(JSON.stringify(scroll)).toContain(ro.result.closeSheet);
  expect(JSON.stringify(scroll)).not.toContain(ro.result.compare);
  expect(screen.getAllByRole('button', { name: /înapoi|back|închide analiza|close product/i })).toHaveLength(1);
});
