import { Animated, StyleSheet, Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
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

it('sits at the bottom, wide at most 480, never taller than 90% of the screen, with no gap under it', async () => {
  await open();
  const panel = StyleSheet.flatten(screen.getByTestId('sheet').props.style);
  expect(panel).toMatchObject({ width: '100%', maxWidth: 480, flexShrink: 1 });
  expect(panel.maxHeight).toBeUndefined(); // a % cap here is a % of the content-sized frame and cut the sheet short, leaving the page showing under it
  expect(StyleSheet.flatten(screen.getByTestId('sheet-frame', { includeHiddenElements: true }).props.style)).toMatchObject({ width: '100%', maxHeight: '90%' });
  expect(StyleSheet.flatten(screen.getByTestId('sheet-scroll').props.style)).toMatchObject({ flexShrink: 1 });
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

describe('sliding in', () => {
  afterEach(() => jest.restoreAllMocks());
  it('slides up and fades its dimmed page in when asked to, instead of popping in', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    await open({ animateIn: true });
    expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, duration: expect.any(Number) }));
    expect(screen.getByTestId('sheet-scrim', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Conținut')).toBeTruthy();
  });
  it('stays as it was for other sheets: no entrance animation', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    await open();
    expect(timing).not.toHaveBeenCalled();
    expect(screen.queryByTestId('sheet-scrim', { includeHiddenElements: true })).toBeNull();
  });
});

describe('sliding out', () => {
  afterEach(() => jest.restoreAllMocks());
  it('a sheet that slid in slides away before it reports closed, from the backdrop and the back gesture', async () => {
    const finish: (() => void)[] = [];
    jest.spyOn(Animated, 'timing').mockImplementation((_, config) => ({
      start: (done?: () => void) => { if (config.toValue === 0) finish.push(() => done?.()); else done?.(); }, stop: jest.fn(), reset: jest.fn(),
    }) as never);
    const onClose = jest.fn();
    await open({ animateIn: true, onClose, backdropCloses: true });
    await fireEvent.press(screen.getByTestId('sheet-backdrop'));
    expect(onClose).not.toHaveBeenCalled();
    expect(finish).toHaveLength(1);
    await fireEvent.press(screen.getByTestId('sheet-backdrop')); // a second tap while leaving does nothing
    expect(finish).toHaveLength(1);
    await act(() => finish[0]!());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('other sheets close at once, as before', async () => {
    const onClose = jest.fn();
    await open({ onClose, backdropCloses: true });
    await fireEvent.press(screen.getByTestId('sheet-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
