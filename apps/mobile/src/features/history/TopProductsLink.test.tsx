import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ro } from '../../copy/ro';
import { light } from '../../theme/tokens';
import { TopProductsLink } from './TopProductsLink';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

it('is plain text with a chevron, in the dark green, and opens the top products page', async () => {
  await render(<TopProductsLink />);
  const link = screen.getByRole('button', { name: ro.topProducts.title });
  const style = StyleSheet.flatten(link.props.style);
  expect(style.backgroundColor).toBeUndefined();
  expect(style.borderWidth).toBeUndefined();
  expect(style.minHeight).toBeGreaterThanOrEqual(44);
  expect(screen.getByText(ro.topProducts.title)).toBeTruthy();
  expect(StyleSheet.flatten(screen.getByText(ro.topProducts.title).props.style).color).toBe(light.primary);
  await fireEvent.press(link);
  expect(router.push).toHaveBeenCalledWith('/top-products');
});
