import { AccessibilityInfo, StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { fonts, light, radii, shadows } from '../theme/tokens';
import { SearchPill } from './SearchPill';
import { CheckboxChip } from './CheckboxChip';
import { ToggleRow } from './ToggleRow';
import { GoalPill } from './GoalPill';
import { SegmentedTabs } from './SegmentedTabs';
import { ListRow } from './ListRow';
import { SettingsRow } from './SettingsRow';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const flat = (el: { props: Record<string, any> }) => StyleSheet.flatten(el.props.style) as Record<string, unknown>;
const colourKeys = ['backgroundColor', 'borderColor', 'color', 'boxShadow'];
const shape = (style: Record<string, unknown>) => Object.fromEntries(Object.entries(style).filter(([key]) => !colourKeys.includes(key)));
beforeEach(() => jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true));
afterEach(() => jest.restoreAllMocks());

it('SearchPill is a 54 pt raised pill with a labelled input and a decorative filter icon', async () => {
  const onChangeText = jest.fn();
  await render(<SearchPill value="" onChangeText={onChangeText} placeholder="Caută după nume sau marcă" testID="search" />);
  expect(flat(screen.getByTestId('search'))).toMatchObject({ minHeight: 54, borderRadius: radii.pill, backgroundColor: light.surface, boxShadow: shadows.raisedSm });
  await fireEvent.changeText(screen.getByLabelText('Caută după nume sau marcă'), 'iaurt');
  expect(onChangeText).toHaveBeenCalledWith('iaurt');
  expect(screen.queryByRole('button')).toBeNull(); // the sliders icon is not a control
});

describe('selection changes colour only', () => {
  it('CheckboxChip: the pill looks the same selected or not (no green border or fill); only the box fills; no check glyph', async () => {
    const view = await render(<CheckboxChip text="Gluten" selected={false} onPress={jest.fn()} />);
    const off = flat(screen.getByRole('checkbox', { name: 'Gluten' }));
    const offBox = flat(screen.getByTestId('checkbox-box', { includeHiddenElements: true }));
    await view.rerender(<CheckboxChip text="Gluten" selected onPress={jest.fn()} />);
    const chip = screen.getByRole('checkbox', { name: 'Gluten' });
    expect(chip.props.accessibilityState.checked).toBe(true);
    expect(flat(chip)).toEqual(off); // same border, background, size and shadow: nothing on the pill turns green
    expect(flat(chip)).toMatchObject({ backgroundColor: light.surface, borderColor: light.divider, borderWidth: 1.5 });
    const box = flat(screen.getByTestId('checkbox-box', { includeHiddenElements: true }));
    expect(shape(box)).toEqual(shape(offBox));
    expect(offBox).toMatchObject({ backgroundColor: light.transparent, borderColor: light.checkboxBorder });
    expect(box).toMatchObject({ backgroundColor: light.primary, borderColor: light.primary }); // the box is what shows the selection
    expect(JSON.stringify(screen.toJSON())).not.toContain('RNSVGPath'); // no check glyph
    expect(flat(screen.getByText('Gluten')).fontFamily).toBe(fonts.medium);
  });
  it('GoalPill keeps the same size and border width; colours swap', async () => {
    const view = await render(<GoalPill text="Alergii alimentare" selected={false} onPress={jest.fn()} />);
    const off = flat(screen.getByRole('checkbox', { name: 'Alergii alimentare' }));
    await view.rerender(<GoalPill text="Alergii alimentare" selected onPress={jest.fn()} />);
    const on = flat(screen.getByRole('checkbox', { name: 'Alergii alimentare' }));
    expect(shape(on)).toEqual(shape(off));
    expect(on).toMatchObject({ backgroundColor: light.primary, borderColor: light.primary, minHeight: 46 });
    expect(off).toMatchObject({ backgroundColor: light.surface, borderColor: light.divider, borderWidth: 1.5 });
  });
  it('SegmentedTabs keeps every tab the same size and weight; only the selected one is primary', async () => {
    const onChange = jest.fn();
    await render(<SegmentedTabs tabs={[{ key: 'n', label: 'Nutrienți' }, { key: 'i', label: 'Ingrediente' }]} index={0} onChange={onChange} />);
    const [a, b] = screen.getAllByRole('tab');
    expect(a!.props.accessibilityState.selected).toBe(true);
    expect(shape(flat(a!))).toEqual(shape(flat(b!)));
    expect(flat(a!).backgroundColor).toBe(light.primary);
    expect(flat(screen.getByText('Nutrienți')).fontFamily).toBe(flat(screen.getByText('Ingrediente')).fontFamily);
    await fireEvent.press(b!);
    expect(onChange).toHaveBeenCalledWith(1);
  });
  it('ToggleRow never moves or resizes the row; the switch is 64×38', async () => {
    const view = await render(<ToggleRow label="Zahăr adăugat" on={false} onToggle={jest.fn()} />);
    const off = flat(screen.getByRole('switch', { name: 'Zahăr adăugat' }));
    await view.rerender(<ToggleRow label="Zahăr adăugat" on onToggle={jest.fn()} />);
    const row = screen.getByRole('switch', { name: 'Zahăr adăugat' });
    expect(row.props.accessibilityState.checked).toBe(true);
    expect(flat(row)).toEqual(off);
    expect(flat(screen.getByTestId('switch-track', { includeHiddenElements: true }))).toMatchObject({ width: 64, height: 38, backgroundColor: light.primary, boxShadow: shadows.inset });
  });
});

it('ListRow shows a grade square, the title and a chevron, and reads the full label', async () => {
  const onPress = jest.fn();
  await render(<ListRow title="Iaurt natural 2,5%" score={86} tier="excellent" label="Deschide Iaurt natural 2,5%. 86 din 100" onPress={onPress} />);
  const row = screen.getByRole('button', { name: 'Deschide Iaurt natural 2,5%. 86 din 100' });
  expect(flat(screen.getByText('Iaurt natural 2,5%'))).toMatchObject({ fontSize: 16, fontFamily: fonts.medium });
  expect(flat(row).minHeight).toBeGreaterThanOrEqual(44);
  await fireEvent.press(row);
  expect(onPress).toHaveBeenCalled();
});

it('SettingsRow shows a 46 pt mist icon tile and the title', async () => {
  await render(<SettingsRow icon="shield" title="Alergiile mele" onPress={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Alergiile mele' })).toBeTruthy();
  expect(flat(screen.getByTestId('settings-tile', { includeHiddenElements: true }))).toMatchObject({ width: 46, height: 46, borderRadius: 14, backgroundColor: light.mist });
});
