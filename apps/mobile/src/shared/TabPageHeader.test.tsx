import { render, screen } from '@testing-library/react-native';
import { TabPageHeader } from './TabPageHeader';

it('renders only the title when there is no subtitle, leaving no empty line', async () => {
  await render(<TabPageHeader title="Istoric" />);
  expect(screen.getByRole('header', { name: 'Istoric' })).toBeTruthy();
  expect(screen.queryByTestId('tab-page-subtitle')).toBeNull();
});

it('renders a subtitle when one is given', async () => {
  await render(<TabPageHeader title="Comparație" subtitle="Iaurturi · 100 g" />);
  expect(screen.getByTestId('tab-page-subtitle')).toHaveTextContent('Iaurturi · 100 g');
});
