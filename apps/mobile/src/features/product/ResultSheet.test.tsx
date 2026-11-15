import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { foundYogurt } from '../../test/fixtures';
import { ro } from '../../copy/ro';
import { ResultSheet } from './ResultSheet';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => false } }));

it('renders a modal result, opens the full page, and closes without navigating', async () => {
  const close = jest.fn();
  await render(<ResultSheet {...foundYogurt} onClose={close} />);
  expect(screen.getByTestId('result-sheet').props.accessibilityViewIsModal).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: ro.app.open }));
  expect(router.push).toHaveBeenCalledWith(`/product/${foundYogurt.product.id}`);
  await fireEvent.press(screen.getByRole('button', { name: ro.app.close }));
  expect(close).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByTestId('result-sheet-backdrop'));
  expect(close).toHaveBeenCalledTimes(2);
});

it('keeps report and additive sheets usable above the result sheet', async () => {
  const product = { ...foundYogurt.product, ingredients: [{
    slug: 'colorant-caramel-e150d', name: 'colorant caramel', group: 'add' as const, risk: 'moderate' as const,
    role: 'Colorant', explanation: 'Explicație de test.', source: 'https://example.invalid/source', allergen: null,
  }] };
  await render(<ResultSheet product={product} score={foundYogurt.score} onClose={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: ro.result.report }));
  expect(screen.getByLabelText(ro.result.reportLabel)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.app.cancel }));
  await fireEvent.press(screen.getByRole('button', { name: 'colorant caramel, Risc moderat' }));
  expect(screen.getAllByText('Explicație de test.')).toHaveLength(2);
});
