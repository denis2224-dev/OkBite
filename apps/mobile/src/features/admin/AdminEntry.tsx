
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Body } from '../../ui';
import { ro } from '../../copy/ro';
export function AdminEntry() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ro.app.admin.versionLabel}
      onLongPress={() => router.push('/admin')}
      style={{ minHeight: 48, justifyContent: 'center' }}
    >
      <Body>{`${ro.app.admin.version} ${Constants.expoConfig?.version ?? ''}`}</Body>
    </Pressable>
  );
}
