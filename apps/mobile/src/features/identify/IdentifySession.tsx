import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { StatusPanel } from '../capture/StatusPanel';
import { useScreenActivity } from '../capture/useScreenActivity';
import { CandidateList } from './CandidateList';
import { ConfirmMatch } from './ConfirmMatch';
import { NotFound } from './NotFound';
import { addProductRoute, parseIdentifyParams, productRoute } from './routes';
import { resolveQueued } from '../offline/queue';

export function IdentifySession({ rawParams }: { rawParams: Record<string, string | string[] | undefined> }) {
  const { colors } = useTheme();
  const router = useRouter();
  const activity = useScreenActivity();
  const state = parseIdentifyParams(rawParams);
  const queueId = typeof rawParams.queueId === 'string' ? rawParams.queueId : undefined;
  const frontPhotoId = typeof rawParams.frontPhotoId === 'string' ? rawParams.frontPhotoId : undefined;
  const unknownDraftId = typeof rawParams.unknownDraftId === 'string' ? rawParams.unknownDraftId : undefined;
  const selected = useRef<string | null>(null);
  const finishing = useRef(false);
  const [cleanupPending, setCleanupPending] = useState(false);
  const navigate = (href: Parameters<typeof router.replace>[0]) => { activity.leave(); router.replace(href); };
  const finishConfirmation = async () => {
    if (!selected.current || finishing.current) return;
    finishing.current = true;
    const token = activity.start();
    try {
      if (queueId) await resolveQueued(queueId);
      if (activity.isCurrent(token)) navigate(productRoute(selected.current));
    } catch { if (activity.isCurrent(token)) setCleanupPending(true); }
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
          navigate(addProductRoute({ read: state.read, photoPath: state.photoPath, queueId, frontPhotoId, unknownDraftId, flow: 'guided' }))
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
          navigate(addProductRoute({ read: state.read, photoPath: state.photoPath, queueId, frontPhotoId, unknownDraftId, flow: 'guided' }))
        }
      />
    );
  }
  if (state.kind === 'not_found') {
    return (
      <NotFound
        code={state.read.code}
        onAdd={() =>
          navigate(addProductRoute({ read: state.read, photoPath: state.photoPath, queueId, frontPhotoId, unknownDraftId, flow: 'guided' }))
        }
        onCheckCodeAgain={state.fromCode ? () => navigate('/scan') : undefined}
      />
    );
  }
  return (
    <View style={[styles.center, { backgroundColor: colors.ground }]}>
      <StatusPanel
        message={ro.errors.generic}
        actions={[
          { label: ro.capture.title, onPress: () => navigate('/capture') },
          { label: ro.scan.title, onPress: () => navigate('/scan') },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', padding: 20 },
});
