import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { light, radii } from '../theme/tokens';
import { Button, buttonFill } from './Button';

const outer = () => StyleSheet.flatten(screen.getByRole('button').props.style);
const shadowKeys = ['shadowOpacity', 'shadowRadius', 'elevation', 'boxShadow', 'experimental_backgroundImage'];

it('draws the primary button as a flat forest pill, 52 tall, with a white label', async () => {
  await render(<Button>Compară</Button>);
  expect(outer()).toMatchObject({ backgroundColor: light.primary, borderRadius: radii.pill, minHeight: 52 });
  expect(screen.getByText('Compară')).toHaveStyle({ color: light.onPrimary });
  for (const key of shadowKeys) expect(outer()[key as keyof ReturnType<typeof outer>]).toBeUndefined();
});

it('darkens the primary fill when pressed instead of adding depth', () => {
  expect(buttonFill('primary', true, light)).toBe(light.primaryPressed);
  expect(buttonFill('primary', false, light)).toBe(light.primary);
  expect(buttonFill('secondary', true, light)).toBe(light.sageSoft);
});

it('draws the secondary button as a sage-soft pill with a forest label and no border', async () => {
  await render(<Button variant="secondary">Anulează</Button>);
  expect(outer()).toMatchObject({ backgroundColor: light.sageSoft, borderRadius: radii.pill });
  expect(outer().borderWidth ?? 0).toBe(0);
  expect(screen.getByText('Anulează')).toHaveStyle({ color: light.primary });
});

it('draws the ghost button with a forest label and no fill', async () => {
  await render(<Button variant="ghost">Mai târziu</Button>);
  expect(outer().backgroundColor).toBe(light.transparent);
  expect(screen.getByText('Mai târziu')).toHaveStyle({ color: light.primary });
});
