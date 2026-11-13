import { render } from '@testing-library/react-native';
import SettingsTab from '../(tabs)/settings';
import { ThemeProvider } from '../../src/theme/useTheme';
import { ro } from '../../src/copy/ro';

it('offers no appearance choice: the app is light only', async () => {
 const ui = await render(<ThemeProvider><SettingsTab /></ThemeProvider>);
 expect(ui.queryByRole('radiogroup')).toBeNull();
 expect(ui.queryAllByRole('radio')).toHaveLength(0);
 for (const path of ['method', 'privacy', 'terms'] as const) expect(ui.getByRole('button', {name:ro.nav[path]})).toBeTruthy();
});
