import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { TabPageHeader } from './TabPageHeader';
import { fonts, light } from '../theme/tokens';

it('renders only the title when there is no subtitle, leaving no empty line', async () => {
  await render(<TabPageHeader title="Istoric" />);
  expect(screen.getByRole('header', { name: 'Istoric' })).toBeTruthy();
  expect(screen.queryByTestId('tab-page-subtitle')).toBeNull();
});

it('renders a subtitle when one is given', async () => {
  await render(<TabPageHeader title="Comparație" subtitle="Iaurturi · 100 g" />);
  expect(screen.getByTestId('tab-page-subtitle')).toHaveTextContent('Iaurturi · 100 g');
});

it('shows a back icon button only when asked, and calls onBack', async () => {
  const onBack = jest.fn();
  await render(<TabPageHeader title="Setări" onBack={onBack} />);
  const back = screen.getByRole('button', { name: 'Înapoi' });
  await fireEvent.press(back);
  expect(onBack).toHaveBeenCalledTimes(1);
});

it('has no back button by default', async () => {
  await render(<TabPageHeader title="Istoric" />);
  expect(screen.queryByRole('button', { name: 'Înapoi' })).toBeNull();
});

it('sets the page title in the forest serif', async () => {
  await render(<TabPageHeader title="Profil" />);
  expect(StyleSheet.flatten(screen.getByRole('header', { name: 'Profil' }).props.style)).toMatchObject({ fontFamily: fonts.heading, color: light.primary, fontSize: 44 });
});
