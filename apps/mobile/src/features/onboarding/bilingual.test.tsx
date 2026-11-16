import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { OnboardingScreen } from './OnboardingScreen';
import { clearProfile } from '../profile/store';
import { resetProfileHookState } from '../profile/useProfile';

let mockLang: 'en' | 'ru' = 'en';
jest.mock('../../copy/lang', () => ({ getLanguage: () => mockLang }));
jest.mock('../../copy/ro', () => {
  const { en } = jest.requireActual<typeof import('../../copy/strings.en')>('../../copy/strings.en');
  const { ru } = jest.requireActual<typeof import('../../copy/strings.ru')>('../../copy/strings.ru');
  return {
    ro: new Proxy({}, { get: (_t, prop: string) => (mockLang === 'ru' ? ru : en)[prop as keyof typeof en] }),
  };
});
jest.mock('../profile/db', () => jest.requireActual('../profile/db.web'));
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
}));

describe('OnboardingScreen localized rendering (mocked language)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockLang = 'en';
    await clearProfile();
    resetProfileHookState();
  });

  it('renders OnboardingScreen in English when English is selected', async () => {
    mockLang = 'en';
    const { findByText } = await render(<OnboardingScreen />);
    expect(await findByText('Română')).toBeTruthy();
    expect(await findByText('Step 1 of 4')).toBeTruthy();
    expect(await findByText('Choose language')).toBeTruthy();
    expect(await findByText('Skip')).toBeTruthy();
    expect(await findByText('Русский')).toBeTruthy();
    expect(await findByText('English')).toBeTruthy();
  });

  it('renders OnboardingScreen in Russian when Russian is selected', async () => {
    mockLang = 'ru';
    const { findByText } = await render(<OnboardingScreen />);
    expect(await findByText('Русский')).toBeTruthy();
    expect(await findByText('Шаг 1 из 4')).toBeTruthy();
    expect(await findByText('Выберите язык')).toBeTruthy();
    expect(await findByText('Пропустить')).toBeTruthy();
  });
});
