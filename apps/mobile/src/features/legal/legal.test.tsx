import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import AboutPage from '../../../app/(tabs)/about';
import PrivacyPage from '../../../app/(info)/privacy';
import TermsPage from '../../../app/(info)/terms';
import MethodPage from '../../../app/(info)/method';
import { ro } from '../../copy/ro';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), canGoBack: () => false, replace: jest.fn() } }));
beforeEach(() => jest.clearAllMocks());
it.each([
  [PrivacyPage, ro.nav.privacy],
  [TermsPage, ro.nav.terms], [MethodPage, ro.nav.method],
])('renders an information page with revision and draft status', async (Page, title) => {
  await render(<Page />);
  expect(screen.getByRole('header', { name: title })).toBeTruthy();
  expect(screen.getByText(/Ultima actualizare/)).toBeTruthy();
  expect(screen.getByText(ro.legal.draft)).toBeTruthy();
});
it('shows the About screen content and score limits', async () => {
  await render(<AboutPage />);
  expect(screen.getByRole('header', { name: ro.about.title })).toBeTruthy();
  for (const text of [ro.about.whatBody, ro.about.promiseBody, ro.score.disclaimer]) {
    expect(screen.getByText(text)).toBeTruthy();
  }
  for (const tier of ['excellent', 'good', 'fair', 'poor', 'bad'] as const) {
    expect(screen.getByText(ro.tiers[tier])).toBeTruthy();
  }
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
it('formats legal pages with the draft notice as a single line above the lead and sections as headings', async () => {
  await render(<PrivacyPage />);
  const texts = screen.getAllByText(/./).map(n => n.props.children as string);
  expect(texts.indexOf(ro.legal.draft)).toBeLessThan(texts.indexOf(ro.legal.privacyLead));
  expect(screen.getAllByText(ro.legal.draft)).toHaveLength(1);
  for (const section of ro.legal.privacySections) expect(screen.getByRole('header', { name: section.title })).toBeTruthy();
});
