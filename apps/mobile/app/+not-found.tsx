import { router } from 'expo-router';
import { ro } from '../src/copy/ro';
import { Body, Button, Screen } from '../src/ui';

export default function NotFoundScreen() {
  return (
    <Screen title={ro.app.routeNotFound.title}>
      <Body>{ro.app.routeNotFound.description}</Body>
      <Button onPress={() => router.replace('/scan')}>{ro.app.routeNotFound.scanButton}</Button>
    </Screen>
  );
}
