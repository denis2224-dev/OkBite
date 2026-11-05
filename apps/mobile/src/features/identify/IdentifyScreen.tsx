import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { StatusPanel } from '../capture/StatusPanel';
import { CandidateList } from './CandidateList';
import { ConfirmMatch } from './ConfirmMatch';
import { NotFound } from './NotFound';
import { addProductRoute, parseIdentifyParams, productRoute } from './routes';
import { resolveQueued } from '../offline/queue';

export default function IdentifyScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const rawParams = useLocalSearchParams();
  const state = parseIdentifyParams(rawParams);
  const queueId = typeof rawParams.queueId === 'string' ? rawParams.queueId : undefined;
  const selected = useRef<string | null>(null);
  const finishing = useRef(false);
  const [cleanupPending, setCleanupPending] = useState(false);
  const finishConfirmation = async () => {
    if (!selected.current || finishing.current) return;
    finishing.current = true;
    try {
      if (queueId) await resolveQueued(queueId);
      router.replace(productRoute(selected.current));
    } catch { setCleanupPending(true); }
    finally { finishing.current = false; }
  };
  const confirm = (id: string) => {
    selected.current = id;
    void finishConfirmation();
  };

  if (cleanupPending) return <View style={[styles.center, { backgroundColor: colors.ground }]}><StatusPanel message={ro.review.savedPendingCleanup} actions={[
    { label: ro.review.finishSave, onPress: () => { void finishConfirmation(); } },
  ]} /></View>;

  if (state.kind === 'confirm') {
    return (
      <ConfirmMatch
        candidate={state.candidate}
        onConfirm={confirm}
        onReject={() =>
          router.replace(addProductRoute({ read: state.read, photoPath: state.photoPath, queueId }))
        }
      />
    );
  }
  if (state.kind === 'candidates') {
    return (
      <CandidateList
        candidates={state.candidates}
        onSelect={confirm}
        onNone={() =>
          router.replace(addProductRoute({ read: state.read, photoPath: state.photoPath, queueId }))
        }
      />
    );
  }
  if (state.kind === 'not_found') {
    return (
      <NotFound
        code={state.read.code}
        onAdd={() =>
          router.replace(addProductRoute({ read: state.read, photoPath: state.photoPath, queueId }))
        }
        onCheckCodeAgain={state.fromCode ? () => router.replace('/scan') : undefined}
      />
    );
  }
  return (
    <View style={[styles.center, { backgroundColor: colors.ground }]}>
      <StatusPanel
        message={ro.errors.generic}
        actions={[
          { label: ro.capture.title, onPress: () => router.replace('/capture') },
          { label: ro.scan.title, onPress: () => router.replace('/scan') },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', padding: 20 },
});
