import { renderRouter, screen } from 'expo-router/testing-library';
import { fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
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

it('opens Scan at / and keeps the photo path available', async () => {
 await renderRouter({ index: ScanTab, capture: () => null });
 expect(await screen.findByText('scanner-test')).toBeTruthy();
 await fireEvent.press(screen.getByRole('button', { name: 'Fotografiază eticheta' }));
 expect(screen).toHavePathname('/capture');
});
it.each(['method', 'privacy', 'terms'] as const)('keeps %s reachable from the About tab', async path => {
 await renderRouter({ about: About, [path]: () => null }, { initialUrl: '/about' });
 await fireEvent.press(screen.getByRole('button', { name: ro.nav[path] }));
 expect(screen).toHavePathname(`/${path}`);
});
const routes = { '(tabs)/_layout': TabLayout, '(tabs)/index': ScanTab, '(tabs)/about': About,
  '(tabs)/history': () => <Text>history-test</Text>, '(tabs)/profile': Profile, '(tabs)/settings': Settings,
  '(tabs)/compare': () => <Text>comparison-test</Text>, 'product/[id]': () => <Text>product-test</Text> };
it('mounts five tabs and releases the scanner on blur', async () => {
 mockCameraMounted.mockClear(); mockCameraStopped.mockClear();
 await renderRouter(routes);
 expect((await screen.findByRole('tab', { name: 'Scanează' })).props.accessibilityState.selected).toBe(true);
 expect(screen.getAllByRole('tab')).toHaveLength(5);
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
