import { act, fireEvent, render } from '@testing-library/react-native';
import { Keyboard, StyleSheet } from 'react-native';
import { light } from '../theme/tokens';
import type { ComponentProps } from 'react';
import { AppBottomNav } from './AppBottomNav';

const names = ['history', 'compare', 'index', 'allergies', 'profile', 'settings', 'about'];
const tabs = ['history', 'compare', 'index', 'allergies', 'profile'];
const makeProps = (index = 2) => ({
 state: { index, routes: names.map(name => ({ key: name, name })) },
 emitter: { emit: jest.fn(() => ({ defaultPrevented: false })) },
 navigateToTab: jest.fn(), insets: { top: 0, left: 0, right: 0, bottom: 34 },
} as unknown as ComponentProps<typeof AppBottomNav>);
const style = (ui: Awaited<ReturnType<typeof render>>, id: string) => StyleSheet.flatten(ui.getByTestId(id).props.style);

it('renders the five tabs in order with Scan selected and Settings/About off the bar', async () => {
 const ui = await render(<AppBottomNav {...makeProps()} />);
 expect(ui.getAllByRole('tab').map(tab => tab.props.accessibilityLabel)).toEqual(['Istoric', 'Compară', 'Scanează', 'Alergii', 'Profil']);
 expect(ui.getByRole('tab', { name: 'Scanează' }).props.accessibilityState.selected).toBe(true);
 expect(ui.getByRole('tab', { name: 'Compară' })).toBeTruthy();
 expect(ui.queryByRole('tab', { name: 'Setări' })).toBeNull();
 expect(ui.queryByRole('tab', { name: 'Despre' })).toBeNull();
});
it('emits navigation and respects prevented tab presses', async () => {
 const props = makeProps(); const ui = await render(<AppBottomNav {...props} />);
 await fireEvent.press(ui.getByRole('tab', { name: 'Alergii' }));
 expect(props.navigateToTab).toHaveBeenCalledWith('allergies');
 (props.emitter.emit as jest.Mock).mockReturnValue({ defaultPrevented: true });
 await fireEvent.press(ui.getByRole('tab', { name: 'Profil' }));
 expect(props.navigateToTab).toHaveBeenCalledTimes(1);
});
it('hides for the keyboard and cleans up listeners', async () => {
 const callbacks: Record<string, () => void> = {}; const remove = jest.fn();
 const spy = jest.spyOn(Keyboard, 'addListener').mockImplementation((name, callback) => { callbacks[name] = () => callback({} as never); return { remove }; });
 const ui = await render(<AppBottomNav {...makeProps()} />);
 await act(() => callbacks.keyboardDidShow!()); expect(ui.queryByRole('tablist')).toBeNull();
 await act(() => callbacks.keyboardDidHide!()); expect(ui.getAllByRole('tab')).toHaveLength(5);
 await ui.unmount(); expect(remove).toHaveBeenCalledTimes(2); spy.mockRestore();
});
it.each([[5, 'settings'], [6, 'about']])('selects no tab while %s (route %s) is open from Profil', async index => {
 const ui = await render(<AppBottomNav {...makeProps(index)} />);
 expect(ui.getAllByRole('tab')).toHaveLength(5);
 expect(ui.getAllByRole('tab').every(tab => !tab.props.accessibilityState.selected)).toBe(true);
});
it('draws the bar as a floating white pill with a thin border and a soft shadow', async () => {
 const ui = await render(<AppBottomNav {...makeProps()} />);
 const pill = style(ui, 'nav-pill');
 expect(pill).toMatchObject({ backgroundColor: light.surface, borderWidth: 1, borderColor: light.border, borderRadius: 999, flexDirection: 'row' });
 expect(pill.shadowOpacity).toBeGreaterThan(0);
 expect(pill.elevation).toBeGreaterThan(0);
 expect(style(ui, 'nav-bar').paddingHorizontal).toBeGreaterThanOrEqual(16); // floats off the screen edges
 expect(pill.marginHorizontal).toBeUndefined(); // no width overflow
});
it.each([[0, 'history'], [1, 'compare'], [2, 'index'], [3, 'allergies'], [4, 'profile']] as const)('fills only the current tab with a dark circle (route %i)', async (index, current) => {
 const ui = await render(<AppBottomNav {...makeProps(index)} />);
 for (const name of tabs) expect(style(ui, `nav-icon-${name}`).backgroundColor).toBe(name === current ? light.primary : light.transparent);
 const dot = style(ui, `nav-icon-${current}`);
 expect([dot.width, dot.height, dot.borderRadius]).toEqual([52, 52, 26]);
});
it('gives every tab the same size; Scan is no longer raised', async () => {
 const ui = await render(<AppBottomNav {...makeProps(0)} />);
 expect(new Set(tabs.map(name => { const { width, height } = style(ui, `nav-icon-${name}`); return `${width}x${height}`; }))).toEqual(new Set(['52x52']));
 for (const tab of ui.getAllByRole('tab')) expect(StyleSheet.flatten(tab.props.style).minHeight).toBeGreaterThanOrEqual(44);
});
it('tints a tab the pointer hovers so it reads as clickable', async () => {
 const ui = await render(<AppBottomNav {...makeProps(2)} />);
 await fireEvent(ui.getByRole('tab', { name: 'Profil' }), 'hoverIn', {});
 expect(style(ui, 'nav-icon-profile').backgroundColor).toBe(light.soft);
 await fireEvent(ui.getByRole('tab', { name: 'Profil' }), 'hoverOut', {});
 expect(style(ui, 'nav-icon-profile').backgroundColor).toBe(light.transparent);
});
it('shows icons only, while screen readers still hear each tab name', async () => {
 const ui = await render(<AppBottomNav {...makeProps()} />);
 for (const label of ['Istoric', 'Compară', 'Scanează', 'Alergii', 'Profil']) {
  expect(ui.queryByText(label)).toBeNull();
  expect(ui.getByRole('tab', { name: label })).toBeTruthy();
 }
});
