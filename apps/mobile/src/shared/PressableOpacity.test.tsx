import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { PressableOpacity } from './PressableOpacity';

it('does not change opacity on hover, so nothing flashes', async () => {
  await render(<PressableOpacity accessibilityRole="button" accessibilityLabel="Acțiune"><Text>Acțiune</Text></PressableOpacity>);
  await fireEvent(screen.getByRole('button'), 'hoverIn', {});
  expect(StyleSheet.flatten(screen.getByRole('button').props.style).opacity).toBeUndefined();
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
it('stays still while pressed: no shrink and no see-through flash', async () => {
  await render(<PressableOpacity testOnly_pressed accessibilityRole="button" accessibilityLabel="Acțiune"><Text>Acțiune</Text></PressableOpacity>);
  const style = StyleSheet.flatten(screen.getByRole('button').props.style);
  expect(style.transform).toBeUndefined();
  expect(style.opacity).toBeUndefined();
});
