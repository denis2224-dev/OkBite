import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import NotFoundScreen from '../+not-found';
import { ThemeProvider } from '../../src/theme/useTheme';
import { ro } from '../../src/copy/ro';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));

it('shows the localized recovery action and returns to Scan', async () => {
  const ui = await render(<ThemeProvider><NotFoundScreen /></ThemeProvider>);

  expect(ui.getByText(ro.app.routeNotFound.title)).toBeTruthy();
  expect(ui.getByText(ro.app.routeNotFound.description)).toBeTruthy();
  await fireEvent.press(ui.getByRole('button', { name: ro.app.routeNotFound.scanButton }));
  expect(router.replace).toHaveBeenCalledWith('/');
});
