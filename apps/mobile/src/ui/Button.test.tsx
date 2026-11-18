import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { light, radii } from '../theme/tokens';
import { depth } from '../theme/depth';
import { Button, buttonSurface } from './Button';

const outer = () => StyleSheet.flatten(screen.getByRole('button').props.style);

it('draws the primary button as a raised forest pill, 52 tall, with a white label', async () => {
  await render(<Button>Compară</Button>);
  expect(outer()).toMatchObject({ ...depth.forest, borderRadius: radii.pill, minHeight: 52 });
  expect(screen.getByText('Compară')).toHaveStyle({ color: light.onPrimary });
});

it('pushes buttons in when pressed', () => {
  expect(buttonSurface('primary', true)).toEqual(depth.forestPressed);
  expect(buttonSurface('secondary', true)).toEqual(depth.pressed);
  expect(buttonSurface('secondary', false)).toMatchObject({ backgroundColor: light.surface, ...depth.raisedSmall });
});

it('draws the secondary button as a raised ivory pill with a forest label and no border', async () => {
  await render(<Button variant="secondary">Anulează</Button>);
  expect(outer()).toMatchObject({ backgroundColor: light.surface, borderRadius: radii.pill, borderWidth: 0, ...depth.raisedSmall });
  expect(screen.getByText('Anulează')).toHaveStyle({ color: light.primary });
});

it('keeps the ghost button flat: forest label, no fill, no shadow', async () => {
  await render(<Button variant="ghost">Mai târziu</Button>);
  expect(outer().backgroundColor).toBe(light.transparent);
  expect(outer().boxShadow).toBeUndefined();
  expect(screen.getByText('Mai târziu')).toHaveStyle({ color: light.primary });
});
