import { AccessibilityInfo, Animated, StyleSheet, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { fonts, light, radii, shadows } from '../theme/tokens';
import { tierTone } from '../theme/tierTones';
import { ro } from '../copy/ro';
import { Icon } from './Icon';
import { SoftCard } from './SoftCard';
import { PrimaryButton, SecondaryButton } from './PillButtons';
import { IconCircleButton } from './IconCircleButton';
import { ScoreBadge } from './ScoreBadge';
import { GradeSquare } from './GradeSquare';
import { ProgressBar } from './ProgressBar';
import { SegmentedScoreBar } from './SegmentedScoreBar';
import { StatusToast } from './StatusToast';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const flat = (el: { props: Record<string, any> }) => StyleSheet.flatten(el.props.style) as Record<string, unknown>;
beforeEach(() => jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true));
afterEach(() => jest.restoreAllMocks());

it('draws the new stroke icons', async () => {
  for (const name of ['search', 'sliders', 'chevron', 'zap', 'shield', 'arrowRight', 'cup'] as const) {
    const view = await render(<Icon name={name} />);
    expect(view.toJSON()).toBeTruthy();
    await view.unmount();
  }
});

it('SoftCard is a raised surface card with radius 24 and padding 20', async () => {
  await render(<SoftCard testID="card"><Text>x</Text></SoftCard>);
  expect(flat(screen.getByTestId('card'))).toMatchObject({ backgroundColor: light.surface, borderRadius: radii.card, padding: 20, boxShadow: shadows.raised });
});

it('PrimaryButton is a 54 pt primary pill with white text and the green glow', async () => {
  const onPress = jest.fn();
  await render(<PrimaryButton label="Compară" icon="arrowRight" onPress={onPress} />);
  const button = screen.getByRole('button', { name: 'Compară' });
  expect(flat(button)).toMatchObject({ minHeight: 54, borderRadius: radii.pill, backgroundColor: light.primary, boxShadow: shadows.primaryGlow });
  expect(flat(screen.getByText('Compară'))).toMatchObject({ color: light.onPrimary, fontFamily: fonts.medium, fontSize: 16 });
  await fireEvent.press(button);
  expect(onPress).toHaveBeenCalled();
});

it('SecondaryButton is a 54 pt surface pill with a 1.5 sand border', async () => {
  await render(<SecondaryButton label="Introdu codul manual" onPress={jest.fn()} />);
  expect(flat(screen.getByRole('button', { name: 'Introdu codul manual' }))).toMatchObject({ minHeight: 54, borderRadius: radii.pill, backgroundColor: light.surface, borderWidth: 1.5, borderColor: light.divider });
  expect(flat(screen.getByText('Introdu codul manual')).color).toBe(light.ink);
});

it('IconCircleButton is a 46 pt raised circle with a label', async () => {
  await render(<IconCircleButton icon="zap" label="Lanternă" onPress={jest.fn()} />);
  expect(flat(screen.getByRole('button', { name: 'Lanternă' }))).toMatchObject({ width: 46, height: 46, borderRadius: 23, backgroundColor: light.surface, boxShadow: shadows.raisedSm });
});

it('ScoreBadge shows the number at once in a primary badge, the tier word beside it, and reads the score once', async () => {
  await render(<ScoreBadge score={86} tier="excellent" label="86 din 100 · Excelent" testID="badge" />);
  expect(screen.getByLabelText('86 din 100 · Excelent')).toBeTruthy();
  expect(screen.getByText('86', { includeHiddenElements: true })).toBeTruthy();
  expect(flat(screen.getByTestId('badge-box', { includeHiddenElements: true }))).toMatchObject({ backgroundColor: light.primary, borderRadius: radii.badge, paddingVertical: 12, paddingHorizontal: 18, boxShadow: shadows.primaryGlow });
  expect(flat(screen.getByText(ro.tiers.excellent, { includeHiddenElements: true }))).toMatchObject({ fontSize: 22, color: tierTone('excellent').word });
});

it('ScoreBadge swings in once unless motion is reduced', async () => {
  jest.restoreAllMocks();
  const timing = jest.spyOn(Animated, 'timing');
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  await render(<ScoreBadge score={74} tier="good" label="x" />);
  await new Promise(r => setTimeout(r, 0));
  expect(timing).toHaveBeenCalledTimes(1);
});

it('GradeSquare is a 50 pt tile in the grade colours, with a dash when there is no score', async () => {
  const view = await render(<GradeSquare score={62} tier="good" testID="sq" />);
  expect(flat(screen.getByTestId('sq', { includeHiddenElements: true }))).toMatchObject({ width: 50, height: 50, borderRadius: 14, backgroundColor: tierTone('good').fill });
  expect(flat(screen.getByText('62', { includeHiddenElements: true }))).toMatchObject({ color: tierTone('good').onFill, fontFamily: fonts.bold, fontSize: 18 });
  await view.rerender(<GradeSquare score={null} tier={null} testID="sq" />);
  expect(screen.getByText('—', { includeHiddenElements: true })).toBeTruthy();
  expect(flat(screen.getByTestId('sq', { includeHiddenElements: true })).backgroundColor).toBe(light.track);
});

it('ProgressBar fills the accent share of an inset track, with no percent label', async () => {
  await render(<ProgressBar value={86} testID="bar" />);
  const bar = screen.getByTestId('bar');
  expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 86 });
  expect(flat(bar)).toMatchObject({ height: 12, borderRadius: radii.pill, backgroundColor: light.track, boxShadow: shadows.inset });
  expect(flat(screen.getByTestId('bar-fill', { includeHiddenElements: true }))).toMatchObject({ width: '86%', backgroundColor: light.accent });
  expect(screen.queryByText(/%/)).toBeNull();
});

it('SegmentedScoreBar draws one grade-coloured segment per tier that has products, no legend', async () => {
  await render(<SegmentedScoreBar mix={{ excellent: 1, good: 3, fair: 0, poor: 0, bad: 0 }} label="1 Excelent, 3 Bun" />);
  expect(screen.getByLabelText('1 Excelent, 3 Bun')).toBeTruthy();
  const colours = ['excellent', 'good'].map(t => flat(screen.getByTestId(`seg-${t}`, { includeHiddenElements: true })).backgroundColor);
  expect(colours).toEqual([tierTone('excellent').fill, tierTone('good').fill]);
  expect(screen.queryByTestId('seg-fair', { includeHiddenElements: true })).toBeNull();
  expect(screen.queryByText(/Excelent/)).toBeNull();
});

it('StatusToast shows one line on a success or danger background', async () => {
  const view = await render(<StatusToast title="Fără alergenii tăi" testID="toast" />);
  expect(flat(screen.getByTestId('toast'))).toMatchObject({ backgroundColor: light.successBg, borderRadius: 20, boxShadow: shadows.raisedSm });
  await view.rerender(<StatusToast variant="danger" title="Conține lapte" testID="toast" />);
  expect(flat(screen.getByTestId('toast')).backgroundColor).toBe(light.dangerBg);
  expect(flat(screen.getByText('Conține lapte')).color).toBe(light.dangerText);
});
