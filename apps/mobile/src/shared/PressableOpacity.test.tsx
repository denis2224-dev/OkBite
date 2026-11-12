import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { PressableOpacity } from './PressableOpacity';

it('dims on hover and restores the normal opacity on exit', async () => {
  await render(<PressableOpacity accessibilityRole="button" accessibilityLabel="Acțiune"><Text>Acțiune</Text></PressableOpacity>);
  await fireEvent(screen.getByRole('button'), 'hoverIn', {});
  expect(StyleSheet.flatten(screen.getByRole('button').props.style).opacity).toBe(0.9);
  await fireEvent(screen.getByRole('button'), 'hoverOut', {});
  expect(StyleSheet.flatten(screen.getByRole('button').props.style).opacity).toBeUndefined();
});
it('retains keyboard focus through activation and omits a ring for pointer presses', async () => {
  await render(<PressableOpacity accessibilityRole="button" accessibilityLabel="Acțiune"><Text>Acțiune</Text></PressableOpacity>);
  const keyboard = { currentTarget: { matches: () => true } };
  await fireEvent(screen.getByRole('button'), 'focus', keyboard);
  await fireEvent(screen.getByRole('button'), 'pressIn', keyboard);
  expect(StyleSheet.flatten(screen.getByRole('button').props.style).outlineWidth).toBe(3);
  await fireEvent(screen.getByRole('button'), 'pressIn', { currentTarget: { matches: () => false } });
  expect(StyleSheet.flatten(screen.getByRole('button').props.style).outlineWidth).toBe(0);
});
it('scales down slightly while pressed so the press is felt without washing out the control', async () => {
  await render(<PressableOpacity testOnly_pressed accessibilityRole="button" accessibilityLabel="Acțiune"><Text>Acțiune</Text></PressableOpacity>);
  const style = StyleSheet.flatten(screen.getByRole('button').props.style);
  expect(style.transform).toEqual([{ scale: 0.97 }]);
  expect(style.opacity).toBeGreaterThanOrEqual(0.8);
});
