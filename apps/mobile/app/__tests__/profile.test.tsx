import 'fake-indexeddb/auto';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import ProfileTab from '../(tabs)/profile';
import { ro } from '../../src/copy/ro';
import { clearProfile, loadProfile } from '../../src/features/profile';
import { resetProfileHookState } from '../../src/features/profile/useProfile';

jest.mock('../../src/features/profile/db', () => jest.requireActual('../../src/features/profile/db.web'));

beforeEach(async () => {
  await clearProfile();
  resetProfileHookState();
});

it('edits the existing local profile and restores the choice after reloading', async () => {
  const screen = await render(<ProfileTab />);
  const health = await screen.findByRole('checkbox', { name: ro.profile.health, disabled: false });
  await act(async () => {
    await fireEvent.press(health);
    await waitFor(async () => expect((await loadProfile()).goals).toEqual(['health']));
  });
  await screen.unmount();
  resetProfileHookState();

  const reopened = await render(<ProfileTab />);
  await waitFor(() => expect(reopened.getByRole('checkbox', { name: ro.profile.health }).props.accessibilityState.checked).toBe(true));
  expect(reopened.getByText(ro.profile.savedLocally)).toBeTruthy();
});
