import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { IdentifySession } from './IdentifySession';

export default function IdentifyScreen() {
  const params = useLocalSearchParams();
  return <IdentifySession key={JSON.stringify(params)} rawParams={params} />;
}
