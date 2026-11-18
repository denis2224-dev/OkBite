import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { depth } from '../../theme/depth';
import { light } from '../../theme/tokens';
import { ToggleChip } from './ToggleChip';

const chipStyle = (name: string) => StyleSheet.flatten(screen.getByRole('checkbox', { name }).props.style);

it('draws an unselected chip as a raised ivory pill with a forest label', async () => {
  await render(<ToggleChip text="Lapte" selected={false} disabled={false} onPress={jest.fn()} />);
  expect(chipStyle('Lapte')).toMatchObject({ backgroundColor: light.surface, boxShadow: depth.raisedSmall.boxShadow, borderWidth: 0 });
  expect(screen.getByText('Lapte')).toHaveStyle({ color: light.primary });
  expect(screen.getByRole('checkbox', { name: 'Lapte' }).props.accessibilityState.selected).toBe(false);
  expect(screen.getByRole('checkbox', { name: 'Lapte' }).children).toHaveLength(1);
});

it('draws a selected chip pressed in on sage, with a forest label, a check icon and the selected state', async () => {
  await render(<ToggleChip text="Soia" selected disabled={false} onPress={jest.fn()} />);
  const chip = screen.getByRole('checkbox', { name: 'Soia' });
  expect(chipStyle('Soia')).toMatchObject({ backgroundColor: depth.pressed.backgroundColor, boxShadow: depth.pressed.boxShadow, borderWidth: 0 });
  expect(screen.getByText('Soia')).toHaveStyle({ color: light.primary });
  expect(chip.props.accessibilityState.selected).toBe(true);
  expect(chip.children).toHaveLength(2);
});

it('never grows wider than its row, so long labels wrap at 200% text', async () => {
  await render(<ToggleChip text="Fructe cu coajă lemnoasă" selected={false} disabled={false} onPress={jest.fn()} />);
  expect(chipStyle('Fructe cu coajă lemnoasă').maxWidth).toBe('100%');
});
