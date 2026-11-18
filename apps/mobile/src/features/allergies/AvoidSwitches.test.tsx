import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ro } from '../../copy/ro';
import { depth } from '../../theme/depth';
import { light } from '../../theme/tokens';
import { AvoidSwitches } from './AvoidSwitches';

const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

beforeEach(async () => {
  await render(<AvoidSwitches selected={['sweeteners']} disabled={false} onToggle={jest.fn()} />);
});

it('draws an on switch as a raised forest track with a white thumb', () => {
  expect(screen.getByRole('switch', { name: ro.profile.sweeteners }).props.accessibilityState.checked).toBe(true);
  expect(flat('avoid-track-sweeteners')).toMatchObject({ backgroundColor: depth.forest.backgroundColor, boxShadow: depth.forest.boxShadow });
  expect(flat('avoid-thumb-sweeteners').backgroundColor).toBe(light.onPrimary);
});

it('draws an off switch as an ivory well with a white thumb', () => {
  expect(flat('avoid-track-palm_oil')).toMatchObject({ backgroundColor: light.surface, boxShadow: depth.well.boxShadow });
  expect(flat('avoid-thumb-palm_oil').backgroundColor).toBe(light.onPrimary);
});

it('gives the thumb a small drop shadow in both states', () => {
  for (const id of ['avoid-thumb-palm_oil', 'avoid-thumb-sweeteners']) expect(flat(id).boxShadow).toMatch(/^\d+px \d+px \d+px rgba/);
});

it('sits in the shared raised card', () => {
  expect(flat('avoid-card')).toMatchObject({ backgroundColor: light.surface, boxShadow: depth.raised.boxShadow });
});
