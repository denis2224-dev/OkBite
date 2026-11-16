import * as native from 'react-native';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { ScoreTag } from './ScoreTag';
import { light } from '../../theme/tokens';
import { ro } from '../../copy/ro';

const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID, { includeHiddenElements: true }).props.style);
afterEach(() => jest.restoreAllMocks());

it('reads its label once and hides the drawn parts from screen readers', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  await render(<ScoreTag score={86} tier="excellent" label="86 din 100 · Excelent" testID="product-score" />);
  const tag = screen.getByTestId('product-score');
  expect(tag).toHaveProp('accessibilityLabel', '86 din 100 · Excelent');
  expect(tag).toHaveProp('accessibilityRole', 'image');
  expect(screen.queryByText('86')).toBeNull(); // hidden from accessibility
  expect(screen.getByText('86', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByText(ro.score.outOf, { includeHiddenElements: true })).toBeTruthy();
});

it('fills the body with the tier colour and prints the number in white', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  await render(<ScoreTag score={41} tier="poor" label="x" testID="tag" />);
  expect(flat('tag-body').backgroundColor).toBe(light.low);
  expect(StyleSheet.flatten(screen.getByText('41', { includeHiddenElements: true }).props.style)).toMatchObject({ fontSize: 40, lineHeight: 44, color: light.onPrimary });
});

it('grows with 200% text instead of fixing its size', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  jest.spyOn(native, 'useWindowDimensions').mockReturnValue({ width: 360, height: 800, scale: 2, fontScale: 2 });
  await render(<ScoreTag score={100} tier="excellent" label="x" testID="tag" />);
  for (const id of ['tag', 'tag-body']) {
    expect(flat(id).width).toBeUndefined();
    expect(flat(id).height).toBeUndefined();
  }
  expect(screen.getByText('100', { includeHiddenElements: true }).props.allowFontScaling).toBe(true);
});

it('stays still when the phone asks for reduced motion', async () => {
  const timing = jest.spyOn(Animated, 'timing');
  const asked = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  await render(<ScoreTag score={86} tier="excellent" label="x" testID="tag" />);
  await waitFor(() => expect(asked).toHaveBeenCalled());
  expect(timing).not.toHaveBeenCalled();
  expect(flat('tag').opacity ?? 1).toBe(1);
});

it('swings in once when motion is allowed', async () => {
  const timing = jest.spyOn(Animated, 'timing');
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  await render(<ScoreTag score={86} tier="excellent" label="x" testID="tag" />);
  await waitFor(() => expect(timing).toHaveBeenCalledTimes(1));
  expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: 500, useNativeDriver: true });
});

it('stays still, without crashing, when the reduced-motion check is unavailable', async () => {
  const timing = jest.spyOn(Animated, 'timing');
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(undefined as unknown as Promise<boolean>);
  await render(<ScoreTag score={86} tier="excellent" label="x" testID="tag" />);
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(timing).not.toHaveBeenCalled();
  expect(screen.getByTestId('tag')).toBeTruthy();
});

it('draws the point in an absolute layer so the drawing can never set the tag height on a phone', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  await render(<ScoreTag score={86} tier="excellent" label="x" testID="tag" />);
  expect(flat('tag-point')).toMatchObject({ width: 22, alignSelf: 'stretch' });
  expect(flat('tag-point').height).toBeUndefined();
  expect(flat('tag-point-art')).toMatchObject({ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 });
});
