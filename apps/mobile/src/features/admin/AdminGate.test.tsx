import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { AdminGate } from './AdminGate';
import { getAdminClient } from './client';
import { consumeInitialAuthUrl } from './callback';
import { ro } from '../../copy/ro';
jest.mock('./client', () => ({ getAdminClient: jest.fn() }));
jest.mock('./callback', () => ({ consumeInitialAuthUrl: jest.fn() }));
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
beforeEach(() => jest.clearAllMocks());
it.each([false, true])(
  'clears router callback state only after accepted session (failure=%s)',
  async (failed) => {
    const setSession = jest
      .fn()
      .mockResolvedValue({ error: failed ? new Error('Invalid callback') : null });
    (getAdminClient as jest.Mock).mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: jest
          .fn()
          .mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
        setSession,
      },
    });
    (consumeInitialAuthUrl as jest.Mock).mockResolvedValue(
      'https://okbite.md/admin#access_token=access&refresh_token=refresh',
    );
    await render(
      <AdminGate>
        <Text>Private admin data</Text>
      </AdminGate>,
    );
    await waitFor(() =>
      expect(setSession).toHaveBeenCalledWith({ access_token: 'access', refresh_token: 'refresh' }),
    );
    if (failed) {
      await waitFor(() => expect(screen.getByText(ro.app.admin.failed)).toBeTruthy());
      expect(router.replace).not.toHaveBeenCalled();
    } else await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin'));
    expect(screen.queryByText('Private admin data')).toBeNull();
  },
);
