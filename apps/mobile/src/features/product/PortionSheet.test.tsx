import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PortionSheet } from './PortionSheet';
import { foundYogurt } from '../../test/fixtures';
import { ro } from '../../copy/ro';
import { depth } from '../../theme/depth';

it('has a drag handle at the top that takes vertical swipes', async () => {
  await render(<PortionSheet product={foundYogurt.product} onClose={jest.fn()} />);
  const handle = screen.getByTestId('portion-sheet-handle', { includeHiddenElements: true });
  expect(typeof handle.props.onResponderRelease).toBe('function');
  expect(typeof handle.props.onMoveShouldSetResponder).toBe('function');
});

it('closes from the backdrop and from the close button', async () => {
  const onClose = jest.fn();
  await render(<PortionSheet product={foundYogurt.product} onClose={onClose} />);
  await fireEvent.press(screen.getByTestId('portion-sheet-backdrop', { includeHiddenElements: true }));
  await fireEvent.press(screen.getByRole('button', { name: ro.nav.close }));
  expect(onClose).toHaveBeenCalledTimes(2);
});

it('turns off text selection on the sheet so a mouse drag on the web moves the sheet instead of selecting text', async () => {
  await render(<PortionSheet product={foundYogurt.product} onClose={jest.fn()} />);
  const sheet = screen.getByTestId('portion-sheet', { includeHiddenElements: true });
  expect(StyleSheet.flatten(sheet.props.style).userSelect).toBe('none');
});

it('opens over the page without darkening it', async () => {
  await render(<PortionSheet product={foundYogurt.product} onClose={jest.fn()} />);
  const overlay = screen.getByTestId('portion-sheet-overlay', { includeHiddenElements: true });
  expect(StyleSheet.flatten(overlay.props.style).backgroundColor ?? 'transparent').toBe('transparent');
});

it('lifts the sheet off the page with the raised soft-depth shadow', async () => {
  await render(<PortionSheet product={foundYogurt.product} onClose={jest.fn()} />);
  const sheet = StyleSheet.flatten(screen.getByTestId('portion-sheet', { includeHiddenElements: true }).props.style);
  expect(sheet).toMatchObject(depth.raised);
  expect(sheet.shadowOpacity).toBeUndefined();
});
