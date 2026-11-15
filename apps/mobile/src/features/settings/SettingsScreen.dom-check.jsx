/** @jest-environment jsdom */
/* global jest, beforeEach, afterEach, expect, it */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsScreen } from './SettingsScreen';
import { ThemeProvider } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { deleteHistory } from '../history/db';
jest.mock('react-native', () => jest.requireActual('react-native-web'));
jest.mock('../../shared/ScreenSafeArea', () => ({ ScreenSafeArea: jest.requireActual('react-native-web').View }));
jest.mock('../../ui/Icon', () => ({ Icon: () => null }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('../history/db', () => ({ deleteHistory: jest.fn(), readHistory: jest.fn(), writeHistory: jest.fn() }));
let root;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  jest.clearAllMocks();
  document.body.innerHTML = '<div id="screen"></div>';
  root = createRoot(document.getElementById('screen'));
});
afterEach(async () => { await act(() => root.unmount()); });
function button(label) {
  const element = document.querySelector(`[role="button"][aria-label="${label}"]`);
  expect(element).not.toBeNull();
  return element;
}
it('exposes the selected language on the real web buttons and offers no theme choice', async () => {
  const setLanguage = jest.fn();
  await act(() => root.render(<ThemeProvider><SettingsScreen currentLanguage="en" setLanguage={setLanguage} /></ThemeProvider>));
  expect(button(ro.settings.english).getAttribute('aria-pressed')).toBe('true');
  expect(button(ro.settings.romanian).getAttribute('aria-pressed')).toBe('false');
  expect(document.getElementById('screen').textContent).not.toMatch(/Întunecat|După telefon/);
  await act(() => button(ro.settings.romanian).click());
  expect(setLanguage).toHaveBeenCalledWith('ro');
  await act(() => root.render(<ThemeProvider><SettingsScreen currentLanguage="ro" setLanguage={setLanguage} /></ThemeProvider>));
  expect(button(ro.settings.romanian).getAttribute('aria-pressed')).toBe('true');
  expect(button(ro.settings.english).getAttribute('aria-pressed')).toBe('false');
});
it('names the actual web modal dialog and cancels it without deleting history', async () => {
  await act(() => root.render(<SettingsScreen />));
  await act(() => button(ro.settings.clearHistory).click());
  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog).not.toBeNull();
  expect(dialog?.getAttribute('aria-label')).toBe(ro.settings.clearHistoryTitle);
  expect(dialog?.getAttribute('aria-modal')).toBe('true');
  await act(() => button(ro.settings.cancel).click());
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(deleteHistory).not.toHaveBeenCalled();
});
