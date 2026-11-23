import { useState } from 'react';
import { Animated, PanResponder, Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SwipeToDelete } from './SwipeToDelete';
import { light as colors } from '../../theme/tokens';

type Config = Parameters<typeof PanResponder.create>[0];
const configs: Config[] = [];
const gesture = (dx: number, dy = 0, vx = 0) => ({ dx, dy, vx, vy: 0 }) as never;
const event = {} as never;
const WIDTH = 300;
const name = 'Șterge Iaurt din istoric';

beforeEach(() => {
  configs.length = 0;
  const create = PanResponder.create.bind(PanResponder);
  jest.spyOn(PanResponder, 'create').mockImplementation(next => { configs.push(next); return create(next); });
  // Jump to the end value so no timers are needed.
  jest.spyOn(Animated, 'timing').mockImplementation((value, { toValue }) => ({
    start: (done?: (result: { finished: boolean }) => void) => { (value as Animated.Value).setValue(toValue as number); done?.({ finished: true }); },
    stop: jest.fn(), reset: jest.fn(),
  }) as never);
});
afterEach(() => jest.restoreAllMocks());

function Row({ id, onDelete }: { id: string; onDelete: () => void }) {
  const [asking, setAsking] = useState(false);
  return <SwipeToDelete label={`${name} ${id}`} text="Șterge" question="Ștergi acest produs?" cancelText="Anulează"
    asking={asking} onAsk={() => setAsking(true)} onCancel={() => setAsking(false)} onDelete={() => { setAsking(false); onDelete(); }}>
    <Text>{`rând ${id}`}</Text>
  </SwipeToDelete>;
}
let rows = 1;
async function setup(ids = ['a'], onDelete = jest.fn()) {
  rows = ids.length;
  await render(<>{ids.map(id => <Row key={id} id={id} onDelete={onDelete} />)}</>);
  for (const frame of screen.getAllByTestId('swipe-frame')) await act(() => { frame.props.onLayout({ nativeEvent: { layout: { width: WIDTH, height: 88 } } }); });
  return onDelete;
}
const last = (index = 0) => configs[configs.length - 1 - index]!;
const swipe = async (dx: number, vx = 0, row = 0) => {
  const config = configs.slice(-rows)[row]!;
  await act(() => { config.onPanResponderMove?.(event, gesture(dx)); });
  await act(() => { config.onPanResponderRelease?.(event, gesture(dx, 0, vx)); });
};
const button = (id = 'a') => screen.queryByRole('button', { name: `${name} ${id}` });
const cardWidth = () => {
  const style = Object.assign({}, ...[screen.getByTestId('swipe-delete-card').props.style].flat(3).filter(Boolean));
  return Number(style.width?.__getValue?.() ?? style.width);
};

it('shows no delete button until the row is swiped', async () => {
  await setup();
  expect(screen.getByText('rând a')).toBeTruthy();
  expect(button()).toBeNull();
});

it('claims a mostly horizontal drag and leaves vertical scrolling alone', async () => {
  await setup();
  expect(last().onMoveShouldSetPanResponder?.(event, gesture(-20, 2))).toBe(true);
  expect(last().onMoveShouldSetPanResponder?.(event, gesture(-20, 30))).toBe(false);
  expect(last().onMoveShouldSetPanResponder?.(event, gesture(-3, 0))).toBe(false);
});

it('the first swipe opens a red card with a trash icon and "Șterge" centred in it, with the row staying in place', async () => {
  await setup();
  await swipe(-90);
  const card = screen.getByTestId('swipe-delete-card');
  const style = Object.assign({}, ...[card.props.style].flat(3).filter(Boolean));
  expect(style.backgroundColor).toBe(colors.destructive);
  expect(style.top).toBe(0);
  expect(style.bottom).toBe(0); // same height as the row
  expect(style.borderRadius).toBe(20); // same corners as the row
  const press = button()!;
  const content = Object.assign({}, ...[press.props.style].flat(3).filter(Boolean));
  expect(content.alignItems).toBe('center');
  expect(content.justifyContent).toBe('center');
  expect(content.minHeight).toBeGreaterThanOrEqual(44);
  expect(screen.getByText('Șterge')).toBeTruthy();
  const tree = JSON.stringify(screen.toJSON());
  expect(tree).toContain('M5 7h14M10 7V5h4v2'); // the trash icon ...
  expect(tree.indexOf('M5 7h14M10 7V5h4v2')).toBeLessThan(tree.indexOf('Șterge"')); // ... on the left of the word
  expect(cardWidth()).toBe(96);
});

it('one long swipe from a closed row only opens the button; it never covers the row', async () => {
  const onDelete = await setup();
  await swipe(-290);
  expect(cardWidth()).toBe(96);
  expect(screen.queryByText('Ștergi acest produs?')).toBeNull();
  expect(onDelete).not.toHaveBeenCalled();
});

it('stays closed after a short swipe and after a swipe to the right', async () => {
  await setup();
  await swipe(-20);
  expect(button()).toBeNull();
  await swipe(60);
  expect(button()).toBeNull();
});

it('opens on a short but fast flick', async () => {
  await setup();
  await swipe(-30, -1);
  expect(button()).toBeTruthy();
});

it('a second swipe covers the whole row, then asks before deleting', async () => {
  const onDelete = await setup();
  await swipe(-90);
  await swipe(-200);
  expect(cardWidth()).toBe(WIDTH);
  expect(screen.getByText('Ștergi acest produs?')).toBeTruthy();
  expect(onDelete).not.toHaveBeenCalled();
});

it('pressing the red button asks too; "Anulează" keeps the row and closes the card', async () => {
  const onDelete = await setup();
  await swipe(-90);
  await fireEvent.press(button()!);
  expect(screen.getByText('Ștergi acest produs?')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Anulează' }));
  expect(onDelete).not.toHaveBeenCalled();
  expect(screen.queryByText('Ștergi acest produs?')).toBeNull();
  expect(button()).toBeNull();
});

it('deletes only after the "Șterge" answer', async () => {
  const onDelete = await setup();
  await swipe(-90);
  await fireEvent.press(button()!);
  await fireEvent.press(screen.getByRole('button', { name: 'Șterge' }));
  expect(onDelete).toHaveBeenCalledTimes(1);
});

it('swiping back closes the card', async () => {
  await setup();
  await swipe(-90);
  await swipe(90);
  expect(button()).toBeNull();
});

it('opening a second row closes the first one', async () => {
  await setup(['a', 'b']);
  await swipe(-90, 0, 0);
  expect(button('a')).toBeTruthy();
  await swipe(-90, 0, 1);
  expect(button('b')).toBeTruthy();
  expect(button('a')).toBeNull();
});
