import { act, fireEvent, render } from '@testing-library/react-native';
import { Keyboard, StyleSheet } from 'react-native';
import { light } from '../theme/tokens';
import type { ComponentProps } from 'react';
import { AppBottomNav } from './AppBottomNav';

const names = ['about', 'history', 'index', 'profile', 'settings', 'compare'];
const makeProps = (index = 2) => ({
 state: { index, routes: names.map(name => ({ key: name, name })) },
 emitter: { emit: jest.fn(() => ({ defaultPrevented: false })) },
 navigateToTab: jest.fn(), insets: { top: 0, left: 0, right: 0, bottom: 34 },
} as unknown as ComponentProps<typeof AppBottomNav>);

it('renders five ordered tabs with Scan selected and Compare hidden', async () => {
 const ui = await render(<AppBottomNav {...makeProps()} />);
 expect(ui.getAllByRole('tab').map(tab => tab.props.accessibilityLabel)).toEqual(['Despre', 'Istoric', 'Scanează', 'Profil', 'Setări']);
 expect(ui.getByRole('tab', { name: 'Scanează' }).props.accessibilityState.selected).toBe(true);
 expect(ui.queryByRole('tab', { name: 'Compară' })).toBeNull();
});
it('emits navigation and respects prevented tab presses', async () => {
 const props = makeProps(); const ui = await render(<AppBottomNav {...props} />);
 await fireEvent.press(ui.getByRole('tab', { name: 'Istoric' }));
 expect(props.navigateToTab).toHaveBeenCalledWith('history');
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
it('leaves no tab falsely selected while the comparison route remains active', async () => {
 const ui = await render(<AppBottomNav {...makeProps(5)} />);
 expect(ui.getAllByRole('tab')).toHaveLength(5);
 expect(ui.getAllByRole('tab').every(tab => !tab.props.accessibilityState.selected)).toBe(true);
});
it('draws every tab icon at the same size, the Scan tab included', async () => {
 const ui = await render(<AppBottomNav {...makeProps(0)} />);
 const sizes = ['about', 'history', 'index', 'profile', 'settings'].map(name => {
  const { width, height } = StyleSheet.flatten(ui.getByTestId(`nav-icon-${name}`).props.style);
  return `${width}x${height}`;
 });
 expect(new Set(sizes).size).toBe(1);
});
it.each([[0, 'about'], [2, 'index'], [4, 'settings']] as const)('marks only the current page (tab %i) with a filled indicator', async (index, current) => {
 const ui = await render(<AppBottomNav {...makeProps(index)} />);
 for (const name of ['about', 'history', 'index', 'profile', 'settings']) {
  const { backgroundColor } = StyleSheet.flatten(ui.getByTestId(`nav-icon-${name}`).props.style);
  expect(backgroundColor).toBe(name === current ? light.primary : light.transparent);
 }
});
it('tints a tab the pointer hovers so it reads as clickable', async () => {
 const ui = await render(<AppBottomNav {...makeProps(2)} />);
 await fireEvent(ui.getByRole('tab', { name: 'Profil' }), 'hoverIn', {});
 expect(StyleSheet.flatten(ui.getByTestId('nav-icon-profile').props.style).backgroundColor).toBe(light.soft);
 await fireEvent(ui.getByRole('tab', { name: 'Profil' }), 'hoverOut', {});
 expect(StyleSheet.flatten(ui.getByTestId('nav-icon-profile').props.style).backgroundColor).toBe(light.transparent);
});
