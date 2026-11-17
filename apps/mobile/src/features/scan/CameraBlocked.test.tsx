import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { CameraBlocked } from './CameraBlocked';
import { light } from '../../theme/tokens';
import { depth } from '../../theme/depth';

const flat = (node: { props: { style?: unknown } }) => StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;

it('sits straight in the inset well (no card of its own) with a sage icon tile and ink text', async () => {
  await render(<CameraBlocked title="t" message="m" actions={[]} />);
  const column = flat(screen.getByTestId('camera-blocked'));
  expect(column.backgroundColor).toBeUndefined();
  expect(column.boxShadow).toBeUndefined();
  expect(flat(screen.getByTestId('camera-blocked-icon'))).toMatchObject(depth.sageTile);
  expect(flat(screen.getByText('t')).color).toBe(light.ink);
  expect(flat(screen.getByText('m')).color).toBe(light.ink);
});

it('makes the first action the raised forest primary and the rest raised ivory secondary', async () => {
  await render(<CameraBlocked message="m" actions={[{ label: 'Unu', onPress: jest.fn() }, { label: 'Doi', onPress: jest.fn() }]} />);
  expect(flat(screen.getByRole('button', { name: 'Unu' }))).toMatchObject(depth.forest);
  expect(flat(screen.getByRole('button', { name: 'Doi' }))).toMatchObject({ backgroundColor: light.surface, ...depth.raisedSmall });
});
