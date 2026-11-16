import { StyleSheet, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { EdgeSwipeBack, goBack } from './EdgeSwipeBack';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: jest.fn() } }));
beforeEach(() => jest.clearAllMocks());

it('goes back to wherever the user was before, and does nothing on the first screen', () => {
  jest.mocked(router.canGoBack).mockReturnValue(true);
  goBack();
  expect(router.back).toHaveBeenCalledTimes(1);
  jest.mocked(router.canGoBack).mockReturnValue(false);
  goBack();
  expect(router.back).toHaveBeenCalledTimes(1);
});

it('lays a thin swipe strip along the left edge, over every page', async () => {
  await render(<EdgeSwipeBack><Text>Pagina</Text></EdgeSwipeBack>);
  expect(screen.getByText('Pagina')).toBeTruthy();
  const strip = screen.getByTestId('edge-swipe', { includeHiddenElements: true });
  expect(StyleSheet.flatten(strip.props.style)).toMatchObject({ position: 'absolute', left: 0, top: 0, bottom: 0, width: 20 });
  expect(typeof strip.props.onResponderRelease).toBe('function');
  expect(typeof strip.props.onMoveShouldSetResponder).toBe('function');
  expect(strip.props.onResponderTerminationRequest()).toBe(false); // a scrolling page cannot steal the swipe
});

it('also goes back with the screen-reader escape gesture', async () => {
  jest.mocked(router.canGoBack).mockReturnValue(true);
  await render(<EdgeSwipeBack><Text>Pagina</Text></EdgeSwipeBack>);
  await fireEvent(screen.getByTestId('edge-swipe-root'), 'accessibilityEscape');
  expect(router.back).toHaveBeenCalledTimes(1);
});
