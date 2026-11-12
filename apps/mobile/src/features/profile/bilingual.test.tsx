import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { ProfileScreen } from './ProfileScreen';
import { clearProfile } from './store';
import { resetProfileHookState } from './useProfile';

jest.mock('../../copy/lang', () => ({ getLanguage: () => 'en' }));
jest.mock('./db', () => jest.requireActual('./db.web'));

describe('ProfileScreen English rendering (mocked language)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearProfile();
    resetProfileHookState();
  });

  it('renders ProfileScreen in English when English is selected', async () => {
    const { findByText } = await render(<ProfileScreen />);
    expect(await findByText('Profile')).toBeTruthy();
    expect(await findByText('What matters to you?')).toBeTruthy();
    expect(await findByText('Saved only on this phone')).toBeTruthy();
    expect(await findByText('More balanced food choices')).toBeTruthy();
  });
});
