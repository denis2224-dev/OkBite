import { Platform, StyleSheet, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { EdgeSwipeBack, goBack } from './EdgeSwipeBack';

let mockPath = '/product/abc';
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: jest.fn() }, usePathname: () => mockPath }));
beforeEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); mockPath = '/product/abc'; });

it('goes back to wherever the user was before, and does nothing on the first screen', () => {
  jest.mocked(router.canGoBack).mockReturnValue(true);
  goBack();
  expect(router.back).toHaveBeenCalledTimes(1);
  jest.mocked(router.canGoBack).mockReturnValue(false);
  goBack();
  expect(router.back).toHaveBeenCalledTimes(1);
});

const stripOf = () => screen.queryByTestId('edge-swipe', { includeHiddenElements: true });

it('lays a thin swipe strip along the left edge on the web, over every page that is not on the nav bar', async () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  await render(<EdgeSwipeBack><Text>Pagina</Text></EdgeSwipeBack>);
  expect(screen.getByText('Pagina')).toBeTruthy();
  const strip = stripOf()!;
  expect(StyleSheet.flatten(strip.props.style)).toMatchObject({ position: 'absolute', left: 0, top: 0, bottom: 0, width: 20 });
  expect(typeof strip.props.onResponderMove).toBe('function'); // the page follows the finger
  expect(typeof strip.props.onResponderRelease).toBe('function');
  expect(typeof strip.props.onMoveShouldSetResponder).toBe('function');
  expect(strip.props.onResponderTerminationRequest()).toBe(false); // a scrolling page cannot steal the swipe
});

it('leaves pushed pages to the native stack gesture on a phone, so there is no strip over them', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  await render(<EdgeSwipeBack><Text>Pagina</Text></EdgeSwipeBack>);
  expect(stripOf()).toBeNull();
});

it.each(['/settings', '/about'])('leaves %s to the native stack gesture on a phone too, since it is a pushed page', async path => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  mockPath = path;
  await render(<EdgeSwipeBack><Text>Pagina</Text></EdgeSwipeBack>);
  expect(stripOf()).toBeNull();
});

it('wraps the page in a view that can be moved sideways while it is dragged', async () => {
  await render(<EdgeSwipeBack><Text>Pagina</Text></EdgeSwipeBack>);
  const content = screen.getByTestId('edge-swipe-content');
  expect(StyleSheet.flatten(content.props.style).transform).toEqual([{ translateX: 0 }]);
});

it('also goes back with the screen-reader escape gesture', async () => {
  jest.mocked(router.canGoBack).mockReturnValue(true);
  await render(<EdgeSwipeBack><Text>Pagina</Text></EdgeSwipeBack>);
  await fireEvent(screen.getByTestId('edge-swipe-root'), 'accessibilityEscape');
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('has no swipe strip and no escape-back on a nav-bar page', async () => {
  mockPath = '/history';
  jest.mocked(router.canGoBack).mockReturnValue(true);
  await render(<EdgeSwipeBack><Text>Pagina</Text></EdgeSwipeBack>);
  expect(screen.getByText('Pagina')).toBeTruthy();
  expect(stripOf()).toBeNull();
  await fireEvent(screen.getByTestId('edge-swipe-root'), 'accessibilityEscape');
  expect(router.back).not.toHaveBeenCalled();
});
