import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import AboutPage from '../about';
import { ro } from '../../src/copy/ro';
import { ThemeProvider } from '../../src/theme/useTheme';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

it('shows the About content without the score tiers', async () => {
  await render(<ThemeProvider><AboutPage /></ThemeProvider>);
  expect(screen.getByText(ro.about.whatBody)).toBeTruthy();
  expect(screen.queryByText(ro.score.disclaimer)).toBeNull();
  for (const tier of ['excellent', 'good', 'fair', 'poor', 'bad'] as const) expect(screen.queryByText(ro.tiers[tier])).toBeNull();
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
