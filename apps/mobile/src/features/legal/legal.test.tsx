import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import AboutPage from '../../../app/(info)/about';
import PrivacyPage from '../../../app/(info)/privacy';
import TermsPage from '../../../app/(info)/terms';
import MethodPage from '../../../app/(info)/method';
import { ro } from '../../copy/ro';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), canGoBack: () => false, replace: jest.fn() } }));
beforeEach(() => jest.clearAllMocks());
it.each([
  [AboutPage, ro.nav.about], [PrivacyPage, ro.nav.privacy],
  [TermsPage, ro.nav.terms], [MethodPage, ro.nav.method],
])('renders an information page with revision and draft status', async (Page, title) => {
  await render(<Page />);
  expect(screen.getByRole('header', { name: title })).toBeTruthy();
  expect(screen.getByText(/Ultima actualizare/)).toBeTruthy();
  expect(screen.getByText(ro.legal.draft)).toBeTruthy();
});
it('keeps the About entry to the authenticated administration route', async () => {
  await render(<AboutPage />);
  await fireEvent(screen.getByLabelText(ro.app.admin.versionLabel), 'longPress');
  expect(router.push).toHaveBeenCalledWith('/admin');
  await fireEvent.press(screen.getByRole('button', { name: ro.nav.privacy }));
  expect(router.push).toHaveBeenCalledWith('/privacy');
});
it('explains unavailable scores without implying demo scores are real', async () => {
  await render(<MethodPage />);
  expect(screen.getByText(ro.score.disclaimer)).toBeTruthy();
  expect(screen.getByText(/Motorul de calcul este integrat/)).toBeTruthy();
  expect(screen.getByText(/verificarea umană.*rămâne în curs/)).toBeTruthy();
  expect(screen.getByText(/ilustrative/)).toBeTruthy();
});
it('discloses local queues, public contribution photos and incomplete provider setup', async () => {
  await render(<PrivacyPage />);
  expect(screen.getByText(/identificator aleatoriu/)).toBeTruthy();
  expect(screen.getByText(/Ștergerea istoricului nu șterge/)).toBeTruthy();
  expect(screen.getByText(/publice/)).toBeTruthy();
  expect(screen.getByText(/TokenHarbor.*DeepSeek/)).toBeTruthy();
  expect(screen.queryByText(/funcții nu sunt încă integrate/)).toBeNull();
  expect(screen.getByText(ro.legal.contactPending)).toBeTruthy();
});
