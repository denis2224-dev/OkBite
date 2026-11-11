import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { OnboardingScreen } from './OnboardingScreen';
import { clearProfile } from '../profile/store';
import { resetProfileHookState } from '../profile/useProfile';

jest.mock('../../copy/lang', () => ({ getLanguage: () => 'en' }));
jest.mock('../profile/db', () => jest.requireActual('../profile/db.web'));
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
}));

describe('OnboardingScreen English rendering (mocked language)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearProfile();
    resetProfileHookState();
  });

  it('renders OnboardingScreen in English when English is selected', async () => {
    const { findByText } = await render(<OnboardingScreen />);
    expect(await findByText('Step 1 of 3')).toBeTruthy();
    expect(await findByText('What matters to you?')).toBeTruthy();
    expect(await findByText('Skip')).toBeTruthy();
    expect(await findByText('More balanced food choices')).toBeTruthy();
  });
});
