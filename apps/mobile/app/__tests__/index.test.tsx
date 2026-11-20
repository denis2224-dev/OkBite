import { renderRouter, screen } from 'expo-router/testing-library';
import { fireEvent } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { ro } from '../../src/copy/ro';
import ScanTab from '../(tabs)/index';
import About from '../(tabs)/about';
import TabLayout from '../(tabs)/_layout';
import Profile from '../(tabs)/profile';
import Settings from '../(tabs)/settings';

const mockCameraMounted = jest.fn(); const mockCameraStopped = jest.fn();
jest.mock('../../src/features/scan/ScanScreen', () => ({ __esModule: true, default: function Scanner() {
 const React = jest.requireActual('react'); const { Text } = jest.requireActual('react-native');
 React.useEffect(() => { mockCameraMounted(); return mockCameraStopped; }, []);
 return <Text>scanner-test</Text>;
} }));
jest.mock('../../src/features/admin/AdminEntry', () => ({ AdminEntry: () => null }));

it('opens Scan at / with only the camera, the light button and the close-up button', async () => {
 await renderRouter({ index: ScanTab, capture: () => null });
 expect(await screen.findByText('scanner-test')).toBeTruthy();
 expect(screen.getByRole('button', { name: ro.scan.flashOn })).toBeTruthy();
 expect(screen.getByRole('button', { name: ro.scan.closeUpOn })).toBeTruthy();
 expect(screen.queryByRole('button', { name: 'Fotografiază eticheta' })).toBeNull();
});
it.each(['method', 'privacy', 'terms'] as const)('keeps %s reachable from the About tab', async path => {
 await renderRouter({ about: About, [path]: () => null }, { initialUrl: '/about' });
 await fireEvent.press(screen.getByRole('button', { name: ro.nav[path] }));
 expect(screen).toHavePathname(`/${path}`);
});
const routes = { '(tabs)/_layout': TabLayout, '(tabs)/index': ScanTab, '(tabs)/about': About,
  '(tabs)/history': () => <Text>history-test</Text>, '(tabs)/profile': Profile, '(tabs)/settings': Settings,
  '(tabs)/compare': () => <Text>comparison-test</Text>, 'product/[id]': () => <Text>product-test</Text> };
it('lifts the install banner above the floating tab bar on Scan', async () => {
 await renderRouter({ index: ScanTab, capture: () => null });
 expect(StyleSheet.flatten((await screen.findByTestId('install-dock')).props.style).paddingBottom).toBeGreaterThanOrEqual(72);
});
it('mounts four tabs and releases the scanner on blur', async () => {
 mockCameraMounted.mockClear(); mockCameraStopped.mockClear();
 await renderRouter(routes);
 expect((await screen.findByRole('tab', { name: 'Scanează' })).props.accessibilityState.selected).toBe(true);
 expect(screen.getAllByRole('tab').map(tab => tab.props.accessibilityLabel)).toEqual(['Istoric', 'Compară', 'Scanează', 'Profil']);
 await fireEvent.press(screen.getByRole('tab', { name: 'Istoric' }));
 expect(await screen.findByText('history-test')).toBeTruthy();
 expect(mockCameraStopped).toHaveBeenCalled();
 await fireEvent.press(screen.getByRole('tab', { name: 'Scanează' }));
 expect(await screen.findByText('scanner-test')).toBeTruthy();
 expect(mockCameraMounted.mock.calls.length).toBeGreaterThan(1);
});
it('keeps comparison reachable by its existing URL', async () => {
 await renderRouter(routes, { initialUrl: '/compare?id=example' });
 expect(await screen.findByText('comparison-test')).toBeTruthy();
 expect(screen).toHavePathname('/compare');
});
it('preserves direct product deep links', async () => {
 await renderRouter(routes, { initialUrl: '/product/example' });
 expect(await screen.findByText('product-test')).toBeTruthy();
 expect(screen).toHavePathname('/product/example');
});
it.each([[ro.nav.settings, '/settings'], [ro.nav.about, '/about']] as const)('opens %s from a Profil row with no tab selected', async (label, path) => {
 await renderRouter(routes, { initialUrl: '/profile' });
 await fireEvent.press(await screen.findByRole('button', { name: label }));
 expect(screen).toHavePathname(path);
 expect(screen.getAllByRole('tab').every(tab => !tab.props.accessibilityState.selected)).toBe(true);
});
it.each(['/settings', '/about'])('keeps the %s deep link working', async path => {
 await renderRouter(routes, { initialUrl: path });
 expect(await screen.findAllByRole('tab')).toHaveLength(4);
 expect(screen).toHavePathname(path);
});
