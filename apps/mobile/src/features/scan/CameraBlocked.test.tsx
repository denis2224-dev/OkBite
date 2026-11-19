import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { CameraBlocked } from './CameraBlocked';
import { light } from '../../theme/tokens';

it('draws the icon circle in a solid colour that shows on the black camera frame', async () => {
  await render(<CameraBlocked message="m" actions={[]} />);
  const background = StyleSheet.flatten(screen.getByTestId('camera-blocked-icon').props.style).backgroundColor as string;
  expect(background).toMatch(/^#[0-9A-F]{6}$/i); // not a translucent black that vanishes on black
  expect(background).not.toBe(light.cameraBackground);
});

it('makes the first action the primary pill and the rest secondary pills', async () => {
  await render(<CameraBlocked message="m" actions={[{ label: 'Unu', onPress: jest.fn() }, { label: 'Doi', onPress: jest.fn() }]} />);
  expect(StyleSheet.flatten(screen.getByRole('button', { name: 'Unu' }).props.style)).toMatchObject({ backgroundColor: light.primary, minHeight: 54 });
  expect(StyleSheet.flatten(screen.getByRole('button', { name: 'Doi' }).props.style)).toMatchObject({ backgroundColor: light.surface, borderColor: light.sand });
});
