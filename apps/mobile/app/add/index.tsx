import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AddCaptureScreen } from '../../src/features/add/AddCaptureScreen';
import { GuidedAddScreen } from '../../src/features/add/GuidedAddScreen';

export { AddCaptureScreen, GuidedAddScreen };

export default function AddRouteScreen() {
  const params = useLocalSearchParams<Record<string, string | string[] | undefined>>();
  const guided = Boolean(params.unknownDraftId || params.frontPhotoId || params.retake || params.flow === 'guided');
  return guided ? <GuidedAddScreen /> : <AddCaptureScreen />;
}
