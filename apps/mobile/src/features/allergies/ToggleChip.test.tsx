import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { light } from '../../theme/tokens';
import { ToggleChip } from './ToggleChip';

const shadowKeys = ['shadowOpacity', 'shadowRadius', 'elevation', 'boxShadow'] as const;
const chipStyle = (name: string) => StyleSheet.flatten(screen.getByRole('checkbox', { name }).props.style);

it('draws an unselected chip as a surface fill with a 1 px border and an ink label', async () => {
  await render(<ToggleChip text="Lapte" selected={false} disabled={false} onPress={jest.fn()} />);
  expect(chipStyle('Lapte')).toMatchObject({ backgroundColor: light.surface, borderWidth: 1, borderColor: light.border });
  expect(screen.getByText('Lapte')).toHaveStyle({ color: light.ink });
  expect(screen.getByRole('checkbox', { name: 'Lapte' }).props.accessibilityState.selected).toBe(false);
  for (const key of shadowKeys) expect(chipStyle('Lapte')[key]).toBeUndefined();
});

it('draws a selected chip as a forest fill with a white label, a check icon and the selected state', async () => {
  await render(<ToggleChip text="Soia" selected disabled={false} onPress={jest.fn()} />);
  const chip = screen.getByRole('checkbox', { name: 'Soia' });
  expect(chipStyle('Soia')).toMatchObject({ backgroundColor: light.primary, borderWidth: 1, borderColor: light.primary });
  expect(screen.getByText('Soia')).toHaveStyle({ color: light.onPrimary });
  expect(light.onPrimary).toBe('#FFFFFF');
  expect(chip.props.accessibilityState.selected).toBe(true);
  expect(chip.children).toHaveLength(2);
  for (const key of shadowKeys) expect(chipStyle('Soia')[key]).toBeUndefined();
});

it('never grows wider than its row, so long labels wrap at 200% text', async () => {
  await render(<ToggleChip text="Fructe cu coajă lemnoasă" selected={false} disabled={false} onPress={jest.fn()} />);
  expect(chipStyle('Fructe cu coajă lemnoasă').maxWidth).toBe('100%');
});
