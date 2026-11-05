import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ro } from '../../copy/ro';
import { Body } from '../../ui';
import { StatusPanel } from '../capture/StatusPanel';
import { listNeedsReview, resolveQueued } from '../offline/queue';
import { CandidateList } from './CandidateList';
import { ConfirmMatch } from './ConfirmMatch';
import { NotFound } from './NotFound';
import { addProductRoute, identifyCodeRoute, identifyPhotoRoute, parseIdentifyParams, parseQueuedId, productRoute } from './routes';

type SavedReview = Awaited<ReturnType<typeof listNeedsReview>>[number];

export default function IdentifyScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams();
  const queuedId = parseQueuedId(rawParams.queuedId);
  const [saved, setSaved] = useState<{ id: string; item?: SavedReview | undefined }>();
  const [cleanupFailed, setCleanupFailed] = useState(false);
  const confirming = useRef(false);
  useEffect(() => {
    if (!queuedId) return;
    let active = true;
    void listNeedsReview().then(items => {
      if (active) setSaved({ id: queuedId, item: items.find(item => item.id === queuedId) });
    }, () => {
      if (active) setSaved({ id: queuedId });
    });
    return () => { active = false; };
  }, [queuedId]);

  const confirm = async (productId: string) => {
    if (confirming.current) return;
    confirming.current = true;
    setCleanupFailed(false);
    try {
      if (queuedId) await resolveQueued(queuedId, productId);
      router.replace(productRoute(productId));
    } catch {
      setCleanupFailed(true);
    } finally {
      confirming.current = false;
    }
  };

  if (queuedId && saved?.id !== queuedId) return <Body>{ro.app.loading}</Body>;
  const item = queuedId ? saved?.item : undefined;
  const savedParams = item && item.result.status !== 'found'
    ? item.kind === 'code'
      ? identifyCodeRoute(item.payload).params
      : identifyPhotoRoute(item.result).params
    : undefined;
  const state = parseIdentifyParams(queuedId ? savedParams ?? {} : rawParams);
  const cleanupMessage = cleanupFailed ? <Body accessibilityRole="alert">{ro.offline.queueError}</Body> : null;

  if (state.kind === 'confirm') {
    return (
      <>{cleanupMessage}<ConfirmMatch
        candidate={state.candidate}
        onConfirm={(id) => { void confirm(id); }}
        onReject={() =>
          router.replace(addProductRoute({ read: state.read, photoPath: state.photoPath, queuedId }))
        }
      /></>
    );
  }
  if (state.kind === 'candidates') {
    return (
      <>{cleanupMessage}<CandidateList
        candidates={state.candidates}
        onSelect={(id) => { void confirm(id); }}
        onNone={() =>
          router.replace(addProductRoute({ read: state.read, photoPath: state.photoPath, queuedId }))
        }
      /></>
    );
  }
  if (state.kind === 'not_found') {
    return (
      <NotFound
        code={state.read.code}
        onAdd={() =>
          router.replace(addProductRoute({ read: state.read, photoPath: state.photoPath, queuedId }))
        }
        onCheckCodeAgain={state.fromCode && !queuedId ? () => router.replace('/scan') : undefined}
      />
    );
  }
  return (
    <View style={styles.center}>
      <StatusPanel
        message={ro.errors.generic}
        actions={queuedId ? [{ label: ro.app.back, onPress: () => router.replace('/offline') }] : [
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
