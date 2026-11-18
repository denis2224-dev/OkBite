import { act, fireEvent, render } from '@testing-library/react-native';
import { Keyboard, StyleSheet } from 'react-native';
import { light } from '../theme/tokens';
import { depth } from '../theme/depth';
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
it('draws the bar as a raised ivory pill with no border', async () => {
 const ui = await render(<AppBottomNav {...makeProps()} />);
 const pill = style(ui, 'nav-pill');
 expect(pill).toMatchObject({ backgroundColor: light.surface, borderRadius: 30, flexDirection: 'row', ...depth.raised });
 expect(pill.borderWidth ?? 0).toBe(0);
 expect(style(ui, 'nav-bar').paddingHorizontal).toBeGreaterThanOrEqual(16); // floats off the screen edges
 expect(pill.marginHorizontal).toBeUndefined(); // no width overflow
});
it('raises Scan as a forest button above the bar, on every route', async () => {
 for (const index of [0, 2, 4]) {
  const ui = await render(<AppBottomNav {...makeProps(index)} />);
  const scan = style(ui, 'nav-icon-index');
  expect(scan).toMatchObject({ width: 58, height: 58, borderRadius: 29, ...depth.forest });
  expect(scan.marginTop).toBeLessThan(0);
 }
});
it.each([[0, 'history'], [1, 'compare'], [3, 'allergies'], [4, 'profile']] as const)('presses only the current tab into a sage pill with a forest icon (route %i)', async (index, current) => {
 const ui = await render(<AppBottomNav {...makeProps(index)} />);
 for (const name of tabs.filter(name => name !== 'index')) {
  const icon = style(ui, `nav-icon-${name}`);
  if (name === current) expect(icon).toMatchObject(depth.pressed);
  else expect(icon.backgroundColor).toBe(light.transparent);
 }
 expect(JSON.stringify(ui.getByTestId(`nav-icon-${current}`).children)).toContain(light.primary);
 for (const tab of ui.getAllByRole('tab')) expect(StyleSheet.flatten(tab.props.style).minHeight).toBeGreaterThanOrEqual(44);
});
it('tints a tab the pointer hovers so it reads as clickable', async () => {
 const ui = await render(<AppBottomNav {...makeProps(2)} />);
 await fireEvent(ui.getByRole('tab', { name: 'Profil' }), 'hoverIn', {});
 expect(style(ui, 'nav-icon-profile').backgroundColor).toBe(light.highlightBg);
 await fireEvent(ui.getByRole('tab', { name: 'Profil' }), 'hoverOut', {});
 expect(style(ui, 'nav-icon-profile').backgroundColor).toBe(light.transparent);
});
it('shows each tab name under its icon, forest for the current tab', async () => {
 const ui = await render(<AppBottomNav {...makeProps(4)} />);
 for (const label of ['Istoric', 'Compară', 'Scanează', 'Alergii', 'Profil']) expect(ui.getByText(label)).toBeTruthy();
 expect(ui.getByText('Profil')).toHaveStyle({ color: light.primary });
 expect(ui.getByText('Istoric')).toHaveStyle({ color: light.muted });
});
