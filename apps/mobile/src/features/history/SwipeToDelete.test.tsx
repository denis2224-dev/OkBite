import { Animated, PanResponder, Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SwipeToDelete } from './SwipeToDelete';
import { light as colors } from '../../theme/tokens';

type Config = Parameters<typeof PanResponder.create>[0];
let config: Config;
const gesture = (dx: number, dy = 0, vx = 0) => ({ dx, dy, vx, vy: 0 }) as never;
const event = {} as never;

beforeEach(() => {
  const create = PanResponder.create.bind(PanResponder);
  jest.spyOn(PanResponder, 'create').mockImplementation(next => { config = next; return create(next); });
  // Jump to the end value so no timers are needed.
  jest.spyOn(Animated, 'timing').mockImplementation((value, { toValue }) => ({
    start: (done?: (result: { finished: boolean }) => void) => { (value as Animated.Value).setValue(toValue as number); done?.({ finished: true }); },
    stop: jest.fn(), reset: jest.fn(),
  }) as never);
});
afterEach(() => jest.restoreAllMocks());

async function setup(onDelete = jest.fn()) {
  await render(<SwipeToDelete label="Șterge Iaurt din istoric" text="Șterge" onDelete={onDelete}><Text>rând</Text></SwipeToDelete>);
  return onDelete;
}
const swipe = async (dx: number, vx = 0) => {
  await act(() => { config.onPanResponderMove?.(event, gesture(dx)); });
  await act(() => { config.onPanResponderRelease?.(event, gesture(dx, 0, vx)); });
};

it('shows no delete button until the row is swiped', async () => {
  await setup();
  expect(screen.getByText('rând')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Șterge Iaurt din istoric' })).toBeNull();
});

it('claims a mostly horizontal drag and leaves vertical scrolling alone', async () => {
  await setup();
  expect(config.onMoveShouldSetPanResponder?.(event, gesture(-20, 2))).toBe(true);
  expect(config.onMoveShouldSetPanResponder?.(event, gesture(-20, 30))).toBe(false);
  expect(config.onMoveShouldSetPanResponder?.(event, gesture(-3, 0))).toBe(false);
});

it('reveals a medium red "Șterge" button after a right-to-left swipe', async () => {
  await setup();
  await swipe(-90);
  const button = screen.getByRole('button', { name: 'Șterge Iaurt din istoric' });
  expect(screen.getByText('Șterge')).toBeTruthy();
  const style = Object.assign({}, ...[button.props.style].flat(3).filter(Boolean));
  expect(style.backgroundColor).toBe(colors.destructive);
  expect(style.minHeight ?? style.height).toBeGreaterThanOrEqual(44);
});

it('stays closed after a short swipe and after a swipe to the right', async () => {
  await setup();
  await swipe(-20);
  expect(screen.queryByRole('button', { name: 'Șterge Iaurt din istoric' })).toBeNull();
  await swipe(60);
  expect(screen.queryByRole('button', { name: 'Șterge Iaurt din istoric' })).toBeNull();
});

it('opens on a short but fast flick', async () => {
  await setup();
  await swipe(-30, -1);
  expect(screen.getByRole('button', { name: 'Șterge Iaurt din istoric' })).toBeTruthy();
});

it('deletes only when the red button is pressed, and swiping back closes it', async () => {
  const onDelete = await setup();
  await swipe(-90);
  expect(onDelete).not.toHaveBeenCalled();
  await swipe(90);
  expect(screen.queryByRole('button', { name: 'Șterge Iaurt din istoric' })).toBeNull();
  await swipe(-90);
  await fireEvent.press(screen.getByRole('button', { name: 'Șterge Iaurt din istoric' }));
  expect(onDelete).toHaveBeenCalledTimes(1);
});
