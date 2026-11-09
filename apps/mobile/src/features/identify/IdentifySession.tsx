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
import { addProductRoute, isGuidedAddEnabled, parseIdentifyParams, productRoute } from './routes';
import { keepPhoto } from '../offline/photos';
import { resolveQueued } from '../offline/queue';
import type { FrontRead } from '@okbite/shared';

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
  const adding = useRef(false);
  const pendingAdd = useRef<{ read: FrontRead; photoPath: string | null } | null>(null);
  const [cleanupPending, setCleanupPending] = useState(false);
  const [addFailed, setAddFailed] = useState(false);
  const navigate = (href: Parameters<typeof router.replace>[0]) => { router.replace(href); activity.leave(); };
  const openAdd = async (read: FrontRead, photoPath: string | null) => {
    const guided = isGuidedAddEnabled();
    if (!guided && !frontPhotoId && !unknownDraftId) {
      navigate(addProductRoute({ read, photoPath, queueId }));
      return;
    }
    if (adding.current) return;
    adding.current = true;
    pendingAdd.current = { read, photoPath };
    setAddFailed(false);
    const token = activity.start();
    try {
      const keptFrontId =
        frontPhotoId ?? (guided && photoPath?.startsWith('file://') ? await keepPhoto(photoPath) : undefined);
      if (activity.isCurrent(token)) {
        navigate(
          addProductRoute({
            read,
            photoPath,
            queueId,
            frontPhotoId: keptFrontId,
            unknownDraftId,
            flow: guided ? 'guided' : undefined,
          }),
        );
      }
    } catch {
      if (activity.isCurrent(token)) setAddFailed(true);
    } finally {
      adding.current = false;
    }
  };
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
  if (addFailed) return <View style={[styles.center, { backgroundColor: colors.ground }]}><StatusPanel message={ro.errors.generic} actions={[
    { label: ro.errors.retry, onPress: () => { if (pendingAdd.current) void openAdd(pendingAdd.current.read, pendingAdd.current.photoPath); } },
    { label: ro.capture.title, onPress: () => navigate('/capture') },
    { label: ro.scan.title, onPress: () => navigate('/scan') },
  ]} /></View>;

  if (state.kind === 'confirm') {
    return (
      <ConfirmMatch
        candidate={state.candidate}
        onConfirm={confirm}
        onReject={() => {
          void openAdd(state.read, state.photoPath);
        }}
      />
    );
  }
  if (state.kind === 'candidates') {
    return (
      <CandidateList
        candidates={state.candidates}
        onSelect={confirm}
        onNone={() => {
          void openAdd(state.read, state.photoPath);
        }}
      />
    );
  }
  if (state.kind === 'not_found') {
    return (
      <NotFound
        code={state.read.code}
        onAdd={() => {
          void openAdd(state.read, state.photoPath);
        }}
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
