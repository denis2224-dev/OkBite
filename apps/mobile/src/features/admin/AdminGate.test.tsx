import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { AdminGate } from './AdminGate';
import { getAdminClient } from './client';
import { consumeInitialAuthUrl } from './callback';
import { ro } from '../../copy/ro';
jest.mock('./client', () => ({ getAdminClient: jest.fn() }));
jest.mock('expo-linking', () => ({
  createURL: () => 'okbite://admin',
  addEventListener: () => ({ remove: jest.fn() }),
}));
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
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
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
it.each(['https://okbite.md/admin', 'okbite://admin'])(
  'rejects a revoked moderator callback even with valid tokens (%s)',
  async (prefix) => {
    const signOut = jest.fn().mockResolvedValue({ error: null });
    (getAdminClient as jest.Mock).mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: jest
          .fn()
          .mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
        setSession: jest
          .fn()
          .mockResolvedValue({ data: { session: { user: { id: 'revoked' } } }, error: null }),
        signOut,
      },
      rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
    });
    (consumeInitialAuthUrl as jest.Mock).mockResolvedValue(
      `${prefix}#access_token=access&refresh_token=refresh`,
    );
    await render(
      <AdminGate>
        <Text>Private admin data</Text>
      </AdminGate>,
    );
    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.queryByText('Private admin data')).toBeNull();
  },
);
it.each(['revoked', 'unavailable'])(
  'withdraws an open admin screen when membership is %s',
  async (state) => {
    jest.useFakeTimers();
    try {
      const rpc = jest.fn().mockResolvedValueOnce({ data: true, error: null });
      if (state === 'revoked') rpc.mockResolvedValue({ data: false, error: null });
      else rpc.mockRejectedValue(new Error('Offline'));
      const signOut = jest.fn().mockResolvedValue({ error: null });
      (getAdminClient as jest.Mock).mockReturnValue({
        auth: {
          getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'staff' } } } }),
          onAuthStateChange: jest
            .fn()
            .mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
          signOut,
        },
        rpc,
      });
      (consumeInitialAuthUrl as jest.Mock).mockResolvedValue(null);
      const { unmount } = await render(
        <AdminGate>
          <Text>Private admin data</Text>
        </AdminGate>,
      );
      await waitFor(() => expect(screen.getByText('Private admin data')).toBeTruthy());
      await act(async () => {
        await jest.advanceTimersByTimeAsync(30_000);
      });
      expect(screen.queryByText('Private admin data')).toBeNull();
      expect(signOut).toHaveBeenCalled();
      await unmount();
    } finally {
      jest.useRealTimers();
    }
  },
);
it('draws the sign-in email input with a surface fill, 1 px border and small radius', async () => {
  const { StyleSheet } = jest.requireActual<typeof import('react-native')>('react-native');
  const { light, radii } = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  (getAdminClient as jest.Mock).mockReturnValue({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
  });
  (consumeInitialAuthUrl as jest.Mock).mockResolvedValue(null);
  await render(<AdminGate><Text>Private admin data</Text></AdminGate>);
  const input = await screen.findByLabelText(ro.app.admin.email);
  expect(StyleSheet.flatten(input.props.style)).toMatchObject({ backgroundColor: light.surface, borderWidth: 1, borderColor: light.border, borderRadius: radii.small });
});
