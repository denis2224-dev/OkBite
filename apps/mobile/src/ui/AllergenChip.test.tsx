import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { AllergenChip } from './AllergenChip';
import { light } from '../theme/tokens';
import { ro } from '../copy/ro';

const chipStyle = (label: string) => StyleSheet.flatten(screen.getByLabelText(label).props.style);

it('marks a declared allergen with the strong warning tone', async () => {
  await render(<AllergenChip name="Lapte" />);
  expect(chipStyle('Lapte').backgroundColor).toBe(light.lowBg);
});

it('shows a possible trace with a softer, outlined tone and announces it as a trace', async () => {
  await render(<AllergenChip name="Soia" tone="trace" />);
  const style = chipStyle(`${ro.result.mayContain} Soia`);
  expect(style.backgroundColor).toBe(light.warningBg);
  expect(style.borderColor).toBe(light.warningBorder);
  expect(style.borderWidth).toBe(1);
  expect(screen.getByText('Soia')).toBeTruthy();
});
