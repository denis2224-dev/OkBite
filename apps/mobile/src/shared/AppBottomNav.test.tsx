import { act, fireEvent, render } from '@testing-library/react-native';
import { Keyboard, StyleSheet } from 'react-native';
import { light, radii, shadows } from '../theme/tokens';
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
it('draws the CALM floating bar: 14 from the sides, 78 high, radius 30, surface and the nav shadow', async () => {
 const ui = await render(<AppBottomNav {...makeProps()} />);
 expect(style(ui, 'nav-bar')).toMatchObject({ paddingHorizontal: 14 });
 expect(style(ui, 'nav-bar').paddingBottom).toBeGreaterThanOrEqual(18);
 expect(style(ui, 'nav-pill')).toMatchObject({ height: 78, borderRadius: radii.nav, backgroundColor: light.surface, boxShadow: shadows.nav, flexDirection: 'row' });
});
it('raises Scanează as a 60 pt primary circle with the green glow, whichever tab is open', async () => {
 const ui = await render(<AppBottomNav {...makeProps(0)} />);
 expect(style(ui, 'nav-icon-index')).toMatchObject({ width: 60, height: 60, borderRadius: 30, backgroundColor: light.primary, boxShadow: shadows.primaryGlow, marginTop: -30 });
});
it.each([[0, 'history'], [1, 'compare'], [3, 'allergies'], [4, 'profile']] as const)('marks the current tab (route %i) by icon colour only, with no dot', async (index, current) => {
 const ui = await render(<AppBottomNav {...makeProps(index)} />);
 const flatTabs = tabs.filter(name => name !== 'index');
 for (const name of tabs) expect(ui.queryByTestId(`nav-dot-${name}`, { includeHiddenElements: true })).toBeNull();
 // The selected icon is drawn in the bright green accent; the others stay muted.
 type Node = { props?: Record<string, unknown>; children?: (Node | string)[] | null };
 const find = (node: Node | string | null, id: string): Node | null => {
  if (!node || typeof node === 'string') return null;
  if (node.props?.testID === id) return node;
  for (const child of node.children ?? []) { const hit = find(child, id); if (hit) return hit; }
  return null;
 };
 const ink = (name: string) => JSON.stringify(find(ui.toJSON() as Node, `nav-icon-${name}`));
 for (const name of flatTabs) expect(ink(name)).toContain(name === current ? light.accent : light.muted);
 const shapes = flatTabs.map(name => { const { backgroundColor: _b, ...rest } = style(ui, `nav-icon-${name}`); return JSON.stringify(rest); });
 expect(new Set(shapes).size).toBe(1); // same size and layout for every flat tab
});
it('shows icons only, while screen readers still hear each tab name', async () => {
 const ui = await render(<AppBottomNav {...makeProps()} />);
 for (const label of ['Istoric', 'Compară', 'Scanează', 'Alergii', 'Profil']) {
  expect(ui.queryByText(label)).toBeNull();
  expect(ui.getByRole('tab', { name: label })).toBeTruthy();
 }
});
