import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { StatusPanel } from '../capture/StatusPanel';
import { useScreenActivity } from '../capture/useScreenActivity';
import { CandidateList } from './CandidateList';
import { ConfirmMatch } from './ConfirmMatch';
import { NotFound } from './NotFound';
import { COMPARE_FLAG, addProductRoute, compareCaptureRoute, compareProductRoute, isCompareFlag, isGuidedAddEnabled, parseIdentifyParams, productRoute } from './routes';
import { keepPhoto, removePhoto } from '../offline/photos';
import { resolveQueued } from '../offline/queue';
import type { FrontRead } from '@okbite/shared';
import { clearIdentifyDraft } from '../add/draftStore';
import { clearUnknownDraft, loadUnknownDraft } from '../add/unknownDraft';

export function IdentifySession({ rawParams }: { rawParams: Record<string, string | string[] | undefined> }) {
  const { colors } = useTheme();
  const router = useRouter();
  const activity = useScreenActivity();
  const [state] = useState(() => parseIdentifyParams(rawParams));
  // The photo came from Compare: the confirmed product goes back there, and a retake keeps the flag.
  const forCompare = isCompareFlag(rawParams[COMPARE_FLAG]);
  const queueId = typeof rawParams.queueId === 'string' ? rawParams.queueId : undefined;
  const frontPhotoId = typeof rawParams.frontPhotoId === 'string' ? rawParams.frontPhotoId : undefined;
  const unknownDraftId = typeof rawParams.unknownDraftId === 'string' ? rawParams.unknownDraftId : undefined;
  const identifyDraftId = typeof rawParams.identifyDraftId === 'string' ? rawParams.identifyDraftId : unknownDraftId;
  const restartMissingDraft = state.kind === 'invalid' && rawParams.source === 'photo' && Boolean(identifyDraftId?.trim());
  const selected = useRef<string | null>(null);
  const finishing = useRef(false);
  const adding = useRef(false);
  const pendingAdd = useRef<{ read: FrontRead; photoPath: string | null } | null>(null);
  const [cleanupPending, setCleanupPending] = useState(false);
  const [addFailed, setAddFailed] = useState(false);
  const cleanupSnapshot = useRef<{ id: string; photos: Set<string>; queueOwned: boolean } | null>(null);
  const queueResolved = useRef(false);
  const leave = activity.leave;
  useFocusEffect(useCallback(() => () => {
    if (identifyDraftId) clearIdentifyDraft(identifyDraftId);
  }, [identifyDraftId]));
  const navigate = (href: Parameters<typeof router.replace>[0]) => {
    router.replace(href);
    if (identifyDraftId) clearIdentifyDraft(identifyDraftId);
    activity.leave();
  };
  useEffect(() => {
    if (restartMissingDraft && identifyDraftId) {
      const destination = unknownDraftId
        ? { pathname: '/add' as const, params: { unknownDraftId, retake: 'front' } }
        : queueId ? '/offline' as const : forCompare ? compareCaptureRoute : '/capture' as const;
      router.replace(destination);
      clearIdentifyDraft(identifyDraftId);
      leave();
    }
  }, [forCompare, identifyDraftId, leave, queueId, restartMissingDraft, router, unknownDraftId]);
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
      if (queueId && !queueResolved.current) {
        await resolveQueued(queueId);
        queueResolved.current = true;
      }
      if (unknownDraftId) {
        if (cleanupSnapshot.current?.id !== unknownDraftId) {
          const draft = await loadUnknownDraft();
          if (draft?.id === unknownDraftId) cleanupSnapshot.current = {
            id: draft.id,
            photos: new Set(Object.values(draft.photos).filter((id): id is string => Boolean(id))),
            queueOwned: Boolean(draft.initial.queueId || queueId),
          };
        }
        await clearUnknownDraft(unknownDraftId);
        const cleanup = cleanupSnapshot.current;
        if (cleanup?.id === unknownDraftId && !cleanup.queueOwned) {
          const newer = await loadUnknownDraft();
          const protectedIds = new Set(Object.values(newer?.photos ?? {}));
          for (const id of cleanup.photos) {
            if (protectedIds.has(id)) cleanup.photos.delete(id);
            else {
              await removePhoto(id);
              cleanup.photos.delete(id);
            }
          }
        }
        cleanupSnapshot.current = null;
      }
      if (activity.isCurrent(token)) {
        setCleanupPending(false);
        navigate(forCompare ? compareProductRoute(selected.current) : productRoute(selected.current));
      }
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
    { label: ro.capture.title, onPress: () => navigate(forCompare ? compareCaptureRoute : '/capture') },
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
        guided={isGuidedAddEnabled() ? { needsFrontPhoto: !state.photoPath } : undefined}
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
          { label: ro.capture.title, onPress: () => navigate(forCompare ? compareCaptureRoute : '/capture') },
          { label: ro.scan.title, onPress: () => navigate('/scan') },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', padding: 20 },
});
