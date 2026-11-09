import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Button } from './Button';
import { AllergenChip } from './AllergenChip';
import { StatusPanel } from '../features/capture/StatusPanel';
import { light } from '../theme/tokens';
import { ManualCode } from '../features/scan/ManualCode';
import { ro } from '../copy/ro';

it('makes disabled actions neutral without fading their text', async () => {
  await render(<Button disabled onPress={jest.fn()}>Salvează</Button>);
  const style = StyleSheet.flatten(screen.getByRole('button').props.style);
  expect(style.opacity ?? 1).toBe(1);
  expect(style.backgroundColor).toBe(light.soft);
  expect(screen.getByText('Salvează').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: light.ink })]));
});
it('preserves label opacity during hover and press feedback', async () => {
  await render(<Button onPress={jest.fn()}>Salvează</Button>);
  await fireEvent(screen.getByRole('button'), 'hoverIn', {});
  expect(StyleSheet.flatten(screen.getByRole('button').props.style).opacity ?? 1).toBe(1);
});
it('shows explicit allergens as warnings and critical failures as errors', async () => {
  await render(<><AllergenChip name="Lapte" /><StatusPanel tone="error" message="Operațiunea a eșuat" actions={[{label: ro.errors.retry, onPress: jest.fn()}]} /></>);
  expect(StyleSheet.flatten(screen.getByText('Lapte').parent!.props.style).backgroundColor).toBe(light.warningBg);
  const alert = screen.getByRole('alert');
  expect(StyleSheet.flatten(alert.props.style).backgroundColor).toBe(light.errorBg);
  expect(within(alert).queryAllByRole('button')).toHaveLength(0);
  expect(screen.getByRole('button', {name: ro.errors.retry})).toBeTruthy();
});
it('gives form fields a strong boundary and a visible focus indicator', async () => {
  await render(<ManualCode onSubmit={jest.fn()} />);
  const input = screen.getByLabelText(ro.scan.manualTitle);
  expect(StyleSheet.flatten(input.props.style).borderColor).toBe(light.controlBorder);
  await fireEvent(input, 'focus', { currentTarget: { matches: () => true } });
  expect(StyleSheet.flatten(screen.getByLabelText(ro.scan.manualTitle).props.style).outlineWidth).toBe(3);
});
