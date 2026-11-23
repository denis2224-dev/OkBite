import { StyleSheet, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SwipeSheet } from './SwipeSheet';

const open = (props: Partial<React.ComponentProps<typeof SwipeSheet>> = {}) =>
  render(<SwipeSheet testID="sheet" onClose={jest.fn()} {...props}><Text>Conținut</Text></SwipeSheet>);

it('shows its content in a panel with no handle bar on top', async () => {
  await open();
  expect(screen.getByText('Conținut')).toBeTruthy();
  expect(screen.getByTestId('sheet')).toBeTruthy();
  expect(screen.queryByTestId('sheet-handle', { includeHiddenElements: true })).toBeNull();
});

it('takes a swipe down from anywhere on the panel, not from a bar: the whole panel is the drag area', async () => {
  await open();
  const panel = screen.getByTestId('sheet');
  expect(typeof panel.props.onMoveShouldSetResponder).toBe('function');
  expect(typeof panel.props.onResponderRelease).toBe('function');
  expect(typeof panel.props.onResponderMove).toBe('function');
});

it('cannot be pulled up: the content does not bounce, so the page behind never shows below the sheet', async () => {
  await open();
  const scroll = screen.getByTestId('sheet-scroll');
  expect(scroll.props.bounces).toBe(false);
  expect(scroll.props.overScrollMode).toBe('never');
});

it('sits at the bottom, wide at most 480, and never taller than 90% of the screen', async () => {
  await open();
  expect(StyleSheet.flatten(screen.getByTestId('sheet').props.style)).toMatchObject({ width: '100%', maxWidth: 480, maxHeight: '90%' });
});

it('closes from the system back gesture, and from the backdrop only when asked to', async () => {
  const onClose = jest.fn();
  await open({ onClose });
  expect(screen.queryByTestId('sheet-backdrop', { includeHiddenElements: true })).toBeNull();
  await screen.unmount();
  await open({ onClose, backdropCloses: true });
  await fireEvent.press(screen.getByTestId('sheet-backdrop', { includeHiddenElements: true }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('can name the dimmed page as a close button for screen readers', async () => {
  const onClose = jest.fn();
  await open({ onClose, backdropCloses: true, backdropLabel: 'Închide' });
  await fireEvent.press(screen.getByRole('button', { name: 'Închide' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});
