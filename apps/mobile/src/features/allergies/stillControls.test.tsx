import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { AllergenChips } from './AllergenChips';
import { AvoidSwitches } from './AvoidSwitches';
import { ro } from '../../copy/ro';

// While a choice saves, the controls are disabled (one save at a time) but must not dim: no flash, no movement.
it('keeps allergen chips fully opaque and the same size while saving', async () => {
  const view = await render(<AllergenChips selected={['Soia']} disabled={false} onToggle={jest.fn()} />);
  const before = StyleSheet.flatten(screen.getByRole('checkbox', { name: ro.allergens.Soia }).props.style);
  await view.rerender(<AllergenChips selected={['Soia']} disabled onToggle={jest.fn()} />);
  const during = StyleSheet.flatten(screen.getByRole('checkbox', { name: ro.allergens.Soia }).props.style);
  expect(during.opacity ?? 1).toBe(1);
  expect(during).toEqual(before);
});

it('keeps the avoid switches fully opaque and the same size while saving', async () => {
  const view = await render(<AvoidSwitches selected={['sweeteners']} disabled={false} onToggle={jest.fn()} />);
  const before = StyleSheet.flatten(screen.getByRole('switch', { name: ro.profile.sweeteners }).props.style);
  await view.rerender(<AvoidSwitches selected={['sweeteners']} disabled onToggle={jest.fn()} />);
  const during = StyleSheet.flatten(screen.getByRole('switch', { name: ro.profile.sweeteners }).props.style);
  expect(during.opacity ?? 1).toBe(1);
  expect(during).toEqual(before);
});
