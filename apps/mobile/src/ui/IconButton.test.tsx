import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { light, radii } from '../theme/tokens';
import { IconButton } from './IconButton';

it('is a labelled 44 pt button with a 40 pt sage-soft square and a forest icon', async () => {
  const onPress = jest.fn();
  await render(<IconButton icon="back" label="Înapoi" onPress={onPress} />);
  const button = screen.getByRole('button', { name: 'Înapoi' });
  const outer = StyleSheet.flatten(button.props.style);
  expect(outer.minWidth).toBeGreaterThanOrEqual(44);
  expect(outer.minHeight).toBeGreaterThanOrEqual(44);
  expect(StyleSheet.flatten(screen.getByTestId('icon-button-face').props.style)).toMatchObject({ width: 40, height: 40, borderRadius: radii.small, backgroundColor: light.sageSoft });
  expect(JSON.stringify(screen.toJSON())).toContain(light.primary);
  await fireEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('reports a disabled state and ignores presses', async () => {
  const onPress = jest.fn();
  await render(<IconButton icon="close" label="Închide" disabled onPress={onPress} />);
  const button = screen.getByRole('button', { name: 'Închide' });
  expect(button.props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.press(button);
  expect(onPress).not.toHaveBeenCalled();
});
