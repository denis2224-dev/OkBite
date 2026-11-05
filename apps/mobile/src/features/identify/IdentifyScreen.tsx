import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ro } from '../../copy/ro';
import { StatusPanel } from '../capture/StatusPanel';
import { CandidateList } from './CandidateList';
import { ConfirmMatch } from './ConfirmMatch';
import { NotFound } from './NotFound';
import { addProductRoute, parseIdentifyParams, productRoute } from './routes';

export default function IdentifyScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams();
  const state = parseIdentifyParams(rawParams);

  if (state.kind === 'confirm') {
    return (
      <ConfirmMatch
        candidate={state.candidate}
        onConfirm={(id) => router.replace(productRoute(id))}
        onReject={() =>
          router.replace(addProductRoute({ read: state.read, photoPath: state.photoPath }))
        }
      />
    );
  }
  if (state.kind === 'candidates') {
    return (
      <CandidateList
        candidates={state.candidates}
        onSelect={(id) => router.replace(productRoute(id))}
        onNone={() =>
          router.replace(addProductRoute({ read: state.read, photoPath: state.photoPath }))
        }
      />
    );
  }
  if (state.kind === 'not_found') {
    return (
      <NotFound
        code={state.read.code}
        onAdd={() =>
          router.replace(addProductRoute({ read: state.read, photoPath: state.photoPath }))
        }
        onCheckCodeAgain={state.fromCode ? () => router.replace('/scan') : undefined}
      />
    );
  }
  return (
    <View style={styles.center}>
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
