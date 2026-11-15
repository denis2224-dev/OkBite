import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as tokens from './tokens';
import { letterTones } from './letterTones';
import { ThemeProvider, useTheme } from './useTheme';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: () => 'dark' }));

function Probe() {
  const theme = useTheme();
  return <Text testID="probe">{JSON.stringify({ keys: Object.keys(theme).sort(), ground: theme.colors.ground })}</Text>;
}

beforeEach(async () => { await AsyncStorage.clear(); });

it('always uses the light palette, even when the phone is in dark mode', async () => {
  await render(<ThemeProvider><Probe /></ThemeProvider>);
  expect(JSON.parse(screen.getByTestId('probe').props.children)).toEqual({ keys: ['colors'], ground: tokens.light.ground });
});

it('ignores a dark choice saved by an older version', async () => {
  await AsyncStorage.setItem('okbite.appearance', 'dark');
  await render(<ThemeProvider><Probe /></ThemeProvider>);
  await waitFor(() => expect(JSON.parse(screen.getByTestId('probe').props.children).ground).toBe(tokens.light.ground));
});

it('ships no dark palettes', () => {
  expect('dark' in tokens).toBe(false);
  expect('dark' in letterTones).toBe(false);
  expect(letterTones.A).toEqual({ fg: '#1F6B3A', bg: '#D9EDD9' });
});
