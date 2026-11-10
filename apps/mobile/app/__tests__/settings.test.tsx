import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SettingsTab from '../(tabs)/settings';
import { ThemeProvider } from '../../src/theme/useTheme';
import { ro } from '../../src/copy/ro';

beforeEach(async () => { await AsyncStorage.clear(); });
it('offers system, light and dark themes and restores the saved choice', async () => {
 const ui = await render(<ThemeProvider><SettingsTab /></ThemeProvider>);
 expect(ui.getByRole('radio', {name:ro.app.system}).props.accessibilityState.checked).toBe(true);
 await fireEvent.press(ui.getByRole('radio', {name:ro.home.design.themeLabels.dark}));
 await waitFor(() => expect(ui.getByRole('radio', {name:ro.home.design.themeLabels.dark}).props.accessibilityState.checked).toBe(true));
 expect(ui.getByRole('radio', {name:ro.app.system}).props.accessibilityState.checked).toBe(false);
 await waitFor(async () => expect(await AsyncStorage.getItem('okbite.appearance')).toBe('dark'));
 await ui.unmount();
 const reopened = await render(<ThemeProvider><SettingsTab /></ThemeProvider>);
 await waitFor(() => expect(reopened.getByRole('radio', {name:ro.home.design.themeLabels.dark}).props.accessibilityState.checked).toBe(true));
 await fireEvent.press(reopened.getByRole('radio', {name:ro.home.design.themeLabels.light}));
 expect(reopened.getByRole('radio', {name:ro.home.design.themeLabels.light}).props.accessibilityState.checked).toBe(true);
 await fireEvent.press(reopened.getByRole('radio', {name:ro.app.system}));
 expect(reopened.getByRole('radio', {name:ro.app.system}).props.accessibilityState.checked).toBe(true);
});
