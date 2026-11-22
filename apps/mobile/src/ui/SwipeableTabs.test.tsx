import { StyleSheet, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView, State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { fonts, light } from '../theme/tokens';
import { SwipeableTabs } from './SwipeableTabs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const flat = (el: { props: Record<string, any> }) => StyleSheet.flatten(el.props.style) as Record<string, unknown>;
const colourKeys = ['backgroundColor', 'borderColor', 'color', 'boxShadow'];
const shape = (style: Record<string, unknown>) => Object.fromEntries(Object.entries(style).filter(([key]) => !colourKeys.includes(key)));
const tabs = [
  { key: 'n', label: 'Nutrienți', render: () => <Text>pagina N</Text> },
  { key: 'i', label: 'Ingrediente', render: () => <Text>pagina I</Text> },
  { key: 'a', label: 'Alergeni', render: () => <Text>pagina A</Text> },
];

async function setup(index: number) {
  const onIndexChange = jest.fn();
  await render(<GestureHandlerRootView><SwipeableTabs tabs={tabs} index={index} onIndexChange={onIndexChange} /></GestureHandlerRootView>);
  await fireEvent(screen.getByTestId('swipeable-pages'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 400 } } });
  return onIndexChange;
}
const swipe = (translationX: number, velocityX = 0) => fireGestureHandler(getByGestureTestId('swipeable-pan'), [
  { state: State.BEGAN, translationX: 0, velocityX: 0 },
  { state: State.ACTIVE, translationX: translationX / 2, velocityX },
  { state: State.ACTIVE, translationX, velocityX },
  { state: State.END, translationX, velocityX },
]);

it('draws a tab bar where only colour marks the selected tab, and renders every page side by side', async () => {
  await setup(0);
  const [a, b] = screen.getAllByRole('tab');
  expect(a!.props.accessibilityState.selected).toBe(true);
  expect(b!.props.accessibilityState.selected).toBe(false);
  expect(shape(flat(a!))).toEqual(shape(flat(b!)));
  expect(flat(screen.getByText('Nutrienți'))).toMatchObject({ color: light.onPrimary, fontFamily: fonts.bold });
  expect(flat(screen.getByText('Ingrediente'))).toMatchObject({ color: light.textSecondary, fontFamily: fonts.bold });
  expect(screen.getByTestId('swipeable-indicator')).toBeTruthy();
  expect(screen.getByText('pagina N')).toBeTruthy();
  expect(screen.queryByText('pagina I')).toBeNull(); // off-screen pages are hidden from screen readers
  for (const page of ['pagina I', 'pagina A']) expect(screen.getByText(page, { includeHiddenElements: true })).toBeTruthy();
});

it('switches tab on tap', async () => {
  const onIndexChange = await setup(0);
  await fireEvent.press(screen.getByRole('tab', { name: 'Alergeni' }));
  expect(onIndexChange).toHaveBeenCalledWith(2);
});

it('goes to the next tab past 35% of the width and snaps back before it', async () => {
  const onIndexChange = await setup(0);
  swipe(-90); // 30%
  expect(onIndexChange).not.toHaveBeenCalled();
  swipe(-120); // 40%
  expect(onIndexChange).toHaveBeenCalledWith(1);
});

it('goes back on a quick flick even when the drag is short', async () => {
  const onIndexChange = await setup(1);
  swipe(40, 1200);
  expect(onIndexChange).toHaveBeenCalledWith(0);
});

it('never moves past the first or the last tab', async () => {
  const first = await setup(0);
  swipe(250, 2000);
  expect(first).not.toHaveBeenCalled();
  screen.unmount();
  const last = await setup(2);
  swipe(-250, -2000);
  expect(last).not.toHaveBeenCalled();
});
