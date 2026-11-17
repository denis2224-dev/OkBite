import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ro } from '../../copy/ro';
import { light } from '../../theme/tokens';
import { AvoidSwitches } from './AvoidSwitches';

const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

beforeEach(async () => {
  await render(<AvoidSwitches selected={['sweeteners']} disabled={false} onToggle={jest.fn()} />);
});

it('draws an on switch as a forest track with a white thumb', () => {
  expect(screen.getByRole('switch', { name: ro.profile.sweeteners }).props.accessibilityState.checked).toBe(true);
  expect(flat('avoid-track-sweeteners')).toMatchObject({ backgroundColor: light.primary, borderColor: light.primary });
  expect(flat('avoid-thumb-sweeteners').backgroundColor).toBe(light.onPrimary);
});

it('draws an off switch as a sage-soft track with a border and a white thumb', () => {
  expect(flat('avoid-track-palm_oil')).toMatchObject({ backgroundColor: light.sageSoft, borderColor: light.border, borderWidth: 1 });
  expect(flat('avoid-thumb-palm_oil').backgroundColor).toBe(light.onPrimary);
});

it('keeps tracks and thumbs flat, with at most the shared soft shadow on the thumb', () => {
  for (const id of ['avoid-track-palm_oil', 'avoid-track-sweeteners']) {
    expect(flat(id).shadowOpacity).toBeUndefined();
    expect(flat(id).elevation).toBeUndefined();
  }
  for (const id of ['avoid-thumb-palm_oil', 'avoid-thumb-sweeteners']) {
    expect(flat(id).shadowOpacity ?? 0.05).toBe(0.05);
    expect(flat(id).elevation ?? 1).toBeLessThanOrEqual(1);
  }
});

it('sits in a flat card with a 1 px border', () => {
  expect(flat('avoid-card')).toMatchObject({ backgroundColor: light.surface, borderWidth: 1, borderColor: light.border });
});
