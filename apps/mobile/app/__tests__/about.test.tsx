import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AboutPage from '../(tabs)/about';
import { ro } from '../../src/copy/ro';
import { ThemeProvider } from '../../src/theme/useTheme';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

it.each([
  ['light', ['#1F6B3A', '#3F6B12', '#6E5200', '#93440B', '#9B2C1F']],
  ['dark', ['#9FD8A8', '#C8E07A', '#FFE08A', '#FFB98A', '#FFA99C']],
] as const)('shows the About content and five tier colours in %s mode', async (mode, colours) => {
  await AsyncStorage.setItem('okbite.appearance', mode);
  await render(<ThemeProvider><AboutPage /></ThemeProvider>);
  expect(screen.getByText(ro.about.whatBody)).toBeTruthy();
  expect(screen.getByText(ro.score.disclaimer)).toBeTruthy();
  (['excellent', 'good', 'fair', 'poor', 'bad'] as const).forEach((tier, index) => {
    expect(screen.getByText(ro.tiers[tier]).parent?.children[0]).toHaveStyle({ backgroundColor: colours[index] });
  });
});

it('keeps one working admin entry and legal links reachable', async () => {
  await render(<AboutPage />);
  const admin = screen.getAllByRole('button', { name: ro.app.admin.versionLabel });
  expect(admin).toHaveLength(1);
  await fireEvent(admin[0]!, 'longPress');
  expect(router.push).toHaveBeenCalledWith('/admin');
  for (const path of ['method', 'privacy', 'terms'] as const) {
    await fireEvent.press(screen.getByRole('button', { name: ro.nav[path] }));
    expect(router.push).toHaveBeenCalledWith(`/${path}`);
  }
});
