import { StyleSheet } from 'react-native';
import { render, screen, within } from '@testing-library/react-native';
import { ToggleChip } from './ToggleChip';
import { AvoidSwitches } from './AvoidSwitches';
import { light } from '../../theme/tokens';
import { ro } from '../../copy/ro';

const noop = () => undefined;
const chipStyle = () => StyleSheet.flatten(screen.getByRole('checkbox').props.style);
const label = () => StyleSheet.flatten(screen.getByText('Lapte').props.style);

describe('ToggleChip', () => {
  it('changes only colours when selected: same size, same weight, no icon', async () => {
    await render(<ToggleChip text="Lapte" selected={false} disabled={false} onPress={noop} />);
    const [offChip, offLabel, offChildren] = [chipStyle(), label(), screen.getByRole('checkbox').children.length];
    await screen.unmount();
    await render(<ToggleChip text="Lapte" selected disabled={false} onPress={noop} />);
    const [onChip, onLabel, onChildren] = [chipStyle(), label(), screen.getByRole('checkbox').children.length];
    const { backgroundColor: offBg, ...offRest } = offChip;
    const { backgroundColor: onBg, ...onRest } = onChip;
    expect(onRest).toEqual(offRest);
    const { color: offInk, ...offText } = offLabel;
    const { color: onInk, ...onText } = onLabel;
    expect(onText).toEqual(offText); // same font family and size, so the width never changes
    expect(onChildren).toBe(1);
    expect(offChildren).toBe(1); // never a check icon next to the text
    expect(offBg).toBe(light.soft);
    expect(onBg).toBe(light.primary); // the same dark green as the active tab in the bar
    expect(onInk).toBe(light.onPrimary);
    expect(offInk).toBe(light.ink);
  });
  it('still announces the selected state', async () => {
    await render(<ToggleChip text="Lapte" selected disabled={false} onPress={noop} />);
    expect(screen.getByRole('checkbox').props.accessibilityState).toMatchObject({ checked: true, selected: true });
  });
});

describe('AvoidSwitches', () => {
  it('shows a white knob on a dark green track when on, and the same white knob on the soft track when off', async () => {
    await render(<AvoidSwitches selected={['palm_oil']} disabled={false} onToggle={noop} />);
    const on = screen.getByRole('switch', { name: ro.profile.palm_oil });
    const off = screen.getByRole('switch', { name: ro.profile.sweeteners });
    const find = (node: typeof on) => StyleSheet.flatten(within(node).getByTestId('switch-knob').props.style);
    expect(find(on).backgroundColor).toBe(light.onPrimary);
    expect(find(off).backgroundColor).toBe(light.surface);
    expect(find(on).backgroundColor).not.toBe(light.themeSelectedIcon); // no longer the green-lime dot
  });
});
