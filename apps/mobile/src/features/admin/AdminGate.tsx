import { useEffect, useState, type PropsWithChildren } from 'react';
import { TextInput } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Button, Body } from '../../ui';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { getAdminClient } from './client';
import { sessionFromUrl } from './session';
import { consumeInitialAuthUrl } from './callback';

export function AdminGate({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [client] = useState(() => {
    try {
      return getAdminClient();
    } catch {
      return null;
    }
  });
  const [memberId, setMemberId] = useState<string | null>(null);
  const allowed = !!session && memberId === session.user.id;
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(client ? '' : ro.app.admin.notConfigured);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    if (client) {
      void client.auth.getSession().then(({ data }) => {
        if (alive) setSession(data.session);
      });
      const subscription = client.auth.onAuthStateChange((_event, value) => {
        if (alive) {
          setSession(value);
          setMemberId(null);
        }
      });
      const accept = async (url: string | null) => {
        const tokens = sessionFromUrl(url);
        if (tokens) {
          const result = await client.auth.setSession(tokens);
          if (result.error) throw result.error;
          router.replace('/admin');
        }
      };
      void consumeInitialAuthUrl()
        .then(accept)
        .catch(() => {
          if (alive) setMessage(ro.app.admin.failed);
        });
      const link = Linking.addEventListener('url', ({ url }) => {
        void accept(url).catch(() => setMessage(ro.app.admin.failed));
      });
      return () => {
        alive = false;
        subscription.data.subscription.unsubscribe();
        link.remove();
      };
    }
    return () => {
      alive = false;
    };
  }, [client]);
  useEffect(() => {
    let alive = true;
    if (session && client) {
      void client.rpc('is_moderator').then(({ data, error }) => {
        if (alive) {
          setMemberId(!error && data === true ? session.user.id : null);
          setMessage(!error && data === true ? '' : ro.app.admin.denied);
        }
      });
    }
    return () => {
      alive = false;
    };
  }, [session, client]);
  const signIn = async () => {
    setBusy(true);
    setMessage('');
    try {
      const result = await getAdminClient().auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false,
          emailRedirectTo: Linking.createURL('admin'),
        },
      });
      if (result.error) throw result.error;
      setMessage(ro.app.admin.linkSent);
    } catch {
      setMessage(ro.app.admin.failed);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {!!message && <Body accessibilityRole="alert">{message}</Body>}
      {allowed
        ? children
        : !session &&
          client && (
            <>
              <Body>{ro.app.admin.signIn}</Body>
              <TextInput
                accessibilityLabel={ro.app.admin.email}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                style={{
                  color: colors.ink,
                  borderColor: colors.border,
                  borderWidth: 1,
                  padding: 12,
                  minHeight: 48,
                }}
              />
              <Button disabled={busy || !email.trim() || !client} onPress={() => void signIn()}>
                {ro.app.admin.sendLink}
              </Button>
            </>
          )}
      {!!session && (
        <Button
          variant="ghost"
          onPress={() => {
            void getAdminClient().auth.signOut();
          }}
        >
          {ro.app.admin.signOut}
        </Button>
      )}
    </>
  );
}
