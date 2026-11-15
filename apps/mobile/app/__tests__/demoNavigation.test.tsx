import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import ScanTab from '../(tabs)/index';
import ScanRoute from '../scan';
import { ro } from '../../src/copy/ro';

jest.mock('../../src/lib/preview', () => ({ isPreview: true }));
const Blank = () => null;
// Demo mode must use the real capture and scan routes, never the missing /preview route.
it('in demo mode the photo fallback opens /capture', async () => {
 await renderRouter({ index: ScanTab, capture: Blank, scan: ScanRoute });
 await fireEvent.press(await screen.findByRole('button', { name: 'Fotografiază eticheta' }));
 expect(screen).toHavePathname('/capture');
});
it('in demo mode /scan remains directly reachable with its manual fallback', async () => {
 await renderRouter({ index: ScanTab, capture: Blank, scan: ScanRoute }, { initialUrl: '/scan' });
 expect(await screen.findByRole('header', { name: ro.scan.title })).toBeTruthy();
 await fireEvent.press(screen.getByRole('button', { name: ro.scan.manual }));
 expect(screen.getByLabelText(ro.scan.manualTitle)).toBeTruthy();
 expect(screen).toHavePathname('/scan');
});
