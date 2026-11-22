import { render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import ProductPage from '../../../app/product/[id]/index';
import { ro } from '../../copy/ro';

let mockParams: Record<string, string> = { id: 'test' };
let mockStorageError = false;
jest.mock('expo-router', () => ({ useLocalSearchParams: () => mockParams, router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true } }));
jest.mock('../profile/useProfile', () => ({ useProfile: () => ({ profile: { goals: [], allergens: [], avoid: [], onboarded: true } }) }));
let mockCached = false;
jest.mock('./useProduct', () => ({ useProduct: () => ({ data: jest.requireActual('../../test/fixtures').foundYogurt, error: null, loading: false, storageError: mockStorageError, cached: mockCached, retry: jest.fn() }) }));

it('keeps "Compară cu alt produs" fixed below the scrolling result', async () => {
  await render(<ProductPage />);
  expect(screen.getByRole('button', { name: ro.result.compare })).toBeTruthy();
  type Node = { type: string; children?: (Node | string)[] | null };
  const find = (node: Node | string): Node | undefined => typeof node === 'string' ? undefined
    : node.type === 'RCTScrollView' ? node : node.children?.map(find).find(Boolean);
  const scroll = find(screen.toJSON() as Node);
  expect(JSON.stringify(scroll)).toContain(ro.result.report);
  expect(JSON.stringify(scroll)).not.toContain(ro.result.compare);
  expect(screen.queryAllByRole('button', { name: /înapoi|back|închide analiza|close product/i })).toHaveLength(0); // swipe goes back
});

it('opens a saved result without a note about where it is stored', async () => {
  mockCached = true;
  await render(<ProductPage />);
  expect(screen.getByRole('button', { name: ro.result.compare })).toBeTruthy();
  expect(screen.queryByText(/Rezultat salvat pe acest telefon/)).toBeNull();
  mockCached = false;
});

describe('photographed from Compare', () => {
  beforeEach(() => { jest.clearAllMocks(); mockParams = { id: 'test', forCompare: '1' }; mockStorageError = false; });
  afterEach(() => { mockParams = { id: 'test' }; mockStorageError = false; });
  it('goes back to Compare with the product once it is saved in history', async () => {
    const { foundYogurt } = jest.requireActual('../../test/fixtures');
    await render(<ProductPage />);
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/compare', params: { added: foundYogurt.product.id } });
  });
  it('stays on the product when it could not be saved in history', async () => {
    mockStorageError = true;
    await render(<ProductPage />);
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByText(ro.history.storageError)).toBeTruthy();
  });
  it('does nothing special for a product opened from anywhere else', async () => {
    mockParams = { id: 'test' };
    await render(<ProductPage />);
    expect(router.replace).not.toHaveBeenCalled();
  });
});
