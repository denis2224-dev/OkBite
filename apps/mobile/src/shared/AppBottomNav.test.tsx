import { act, fireEvent, render } from '@testing-library/react-native';
import { Keyboard, StyleSheet } from 'react-native';
import { light } from '../theme/tokens';
import type { ComponentProps } from 'react';
import { AppBottomNav } from './AppBottomNav';

const names = ['history', 'compare', 'index', 'allergies', 'profile', 'settings', 'about'];
const flat = ['history', 'compare', 'allergies', 'profile'];
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
it('raises Scan as a filled 64 pt circle above the flat tabs', async () => {
 const ui = await render(<AppBottomNav {...makeProps(0)} />);
 const scan = style(ui, 'nav-icon-index');
 expect([scan.width, scan.height, scan.borderRadius, scan.backgroundColor]).toEqual([64, 64, 32, light.primary]);
 expect(new Set(flat.map(name => { const { width, height } = style(ui, `nav-icon-${name}`); return `${width}x${height}`; }))).toEqual(new Set(['56x32']));
});
it.each([[0, 'history'], [1, 'compare'], [3, 'allergies'], [4, 'profile']] as const)('marks only the current flat tab (route %i)', async (index, current) => {
 const ui = await render(<AppBottomNav {...makeProps(index)} />);
 for (const name of flat) expect(style(ui, `nav-icon-${name}`).backgroundColor).toBe(name === current ? light.mint : light.transparent);
 expect(ui.getByRole('tab', { name: 'Scanează' }).props.accessibilityState.selected).toBe(false);
});
it('tints a tab the pointer hovers so it reads as clickable', async () => {
 const ui = await render(<AppBottomNav {...makeProps(2)} />);
 await fireEvent(ui.getByRole('tab', { name: 'Profil' }), 'hoverIn', {});
 expect(style(ui, 'nav-icon-profile').backgroundColor).toBe(light.soft);
 await fireEvent(ui.getByRole('tab', { name: 'Profil' }), 'hoverOut', {});
 expect(style(ui, 'nav-icon-profile').backgroundColor).toBe(light.transparent);
});
it('keeps every label whole on one line and lets it shrink at large font sizes', async () => {
 const ui = await render(<AppBottomNav {...makeProps()} />);
 for (const label of ['Istoric', 'Compară', 'Scanează', 'Alergii', 'Profil']) {
  expect(ui.getByText(label).props).toEqual(expect.objectContaining({ numberOfLines: 1, adjustsFontSizeToFit: true }));
 }
});
