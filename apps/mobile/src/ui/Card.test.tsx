import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { light, radii } from '../theme/tokens';
import { depth } from '../theme/depth';
import { Card } from './Card';

it('raises the card off the page with the soft shadow pair and no border', async () => {
  await render(<Card testID="card"><Text>x</Text></Card>);
  expect(StyleSheet.flatten(screen.getByTestId('card').props.style)).toMatchObject({ backgroundColor: light.surface, borderRadius: radii.card, borderWidth: 0, ...depth.raised });
});
