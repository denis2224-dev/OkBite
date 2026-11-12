import { Pressable, Text } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { ro } from '../../src/copy/ro';
import * as store from '../../src/features/profile/store';
import * as db from '../../src/features/profile/db';
import { useProfile } from '../../src/features/profile';
import { resetProfileHookState } from '../../src/features/profile/useProfile';
import TabLayout from '../(tabs)/_layout';
import OnboardingRoute from '../onboarding';

let mockStoredProfile: string | null = null;
jest.mock('../../src/features/profile/db', () => ({
  __esModule: true,
  readProfile: async () => mockStoredProfile,
  writeProfile: async (json: string) => { mockStoredProfile = json; },
  deleteProfile: async () => { mockStoredProfile = null; },
}));
function SettingsProbe() {
  const { hydrated, error, resetOnboarding } = useProfile();
  return <Pressable accessibilityRole="button" accessibilityLabel="Reset onboarding"
    onPress={() => { void resetOnboarding().catch(() => undefined); }}>
    <Text>{error ? 'Reset failed' : hydrated ? 'Profile loaded' : 'Loading'}</Text>
  </Pressable>;
}
const routes = {
  '(tabs)/_layout': TabLayout,
  '(tabs)/index': () => <Text>Scan destination</Text>,
  '(tabs)/about': () => null,
  '(tabs)/history': () => null,
  '(tabs)/profile': () => null,
  '(tabs)/settings': SettingsProbe,
  '(tabs)/compare': () => null,
  onboarding: OnboardingRoute,
  'product/[id]': () => <Text>Deep link destination</Text>,
  'add/review': () => <Text>Deep link destination</Text>,
  'admin/review': () => <Text>Deep link destination</Text>,
};

beforeEach(async () => {
  jest.restoreAllMocks();
  await store.clearProfile();
  resetProfileHookState();
});

it('opens onboarding from fresh storage when landing on the tabs', async () => {
  await renderRouter(routes);
  expect(await screen.findByText(ro.onboarding.goalTitle)).toBeTruthy();
  expect(screen).toHavePathname('/onboarding');
});

it('waits for the profile to load before deciding to redirect', async () => {
  let resolve!: (profile: Awaited<ReturnType<typeof store.loadProfile>>) => void;
  jest.spyOn(store, 'loadProfile').mockReturnValue(new Promise(done => { resolve = done; }));
  await renderRouter(routes);
  expect(screen).toHavePathname('/');
  expect(screen.queryByText(ro.onboarding.goalTitle)).toBeNull();
  await act(async () => { resolve({ goals: [], allergens: [], avoid: [], onboarded: false }); });
  expect(await screen.findByText(ro.onboarding.goalTitle)).toBeTruthy();
});

it.each(['finish', 'skip'])('%s saves onboarding and opens Scan, including on the next launch', async action => {
  await renderRouter(routes, { initialUrl: '/onboarding' });
  await screen.findByText(ro.profile.health);
  if (action === 'finish') {
    await fireEvent.press(screen.getByRole('button', { name: ro.onboarding.continue }));
    await fireEvent.press(screen.getByRole('button', { name: ro.onboarding.continue }));
    await fireEvent.press(screen.getByRole('button', { name: ro.onboarding.done }));
  } else {
    await fireEvent.press(screen.getByRole('button', { name: ro.onboarding.skip }));
  }
  expect(await screen.findByText('Scan destination')).toBeTruthy();
  expect(screen).toHavePathname('/');
  expect((await store.loadProfile()).onboarded).toBe(true);
  await screen.unmount();
  resetProfileHookState();
  const loaded = jest.spyOn(store, 'loadProfile');
  await renderRouter(routes);
  await waitFor(() => expect(loaded).toHaveBeenCalled());
  await act(async () => { await loaded.mock.results[0]?.value; });
  expect(screen).toHavePathname('/');
  expect(screen.queryByText(ro.onboarding.goalTitle)).toBeNull();
});

it.each(['/product/example', '/add/review', '/admin/review'])('preserves a fresh user deep link to %s', async initialUrl => {
  await renderRouter(routes, { initialUrl });
  expect(await screen.findByText('Deep link destination')).toBeTruthy();
  expect(screen).toHavePathname(initialUrl);
  expect(screen.queryByText(ro.onboarding.goalTitle)).toBeNull();
});


it('does not intercept a Settings reset before persistence or after a failed save', async () => {
  await store.saveProfile({ goals: [], allergens: [], avoid: [], onboarded: true });
  await renderRouter(routes, { initialUrl: '/settings' });
  await screen.findByText('Profile loaded');
  let reject!: (error: Error) => void;
  const write = jest.spyOn(db, 'writeProfile').mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
  await fireEvent.press(screen.getByRole('button', { name: 'Reset onboarding' }));
  await waitFor(() => expect(write).toHaveBeenCalled());
  expect(screen).toHavePathname('/settings');
  await act(async () => { reject(new Error('Storage failure')); });
  expect(await screen.findByText('Reset failed')).toBeTruthy();
  expect(screen).toHavePathname('/settings');
  expect((await store.loadProfile()).onboarded).toBe(true);
});
