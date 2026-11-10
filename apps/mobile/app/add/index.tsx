import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AddCaptureScreen } from '../../src/features/add/AddCaptureScreen';
import { GuidedAddScreen } from '../../src/features/add/GuidedAddScreen';

export { AddCaptureScreen, GuidedAddScreen };

const useSafeSearchParams = useLocalSearchParams ?? (() => ({}));

export default function AddRouteScreen() {
  const params = useSafeSearchParams<Record<string, string | string[] | undefined>>();
  const guided =
    params?.flow !== 'manual' &&
    Boolean(params?.unknownDraftId || params?.frontPhotoId || params?.retake || params?.flow === 'guided');
  return guided ? <GuidedAddScreen /> : <AddCaptureScreen />;
}
