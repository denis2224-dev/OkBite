import { StyleSheet, Text, View } from 'react-native';
import { Button, Icon } from '../../ui';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { PanelAction } from '../capture/StatusPanel';

/** A camera that is off, drawn inside the dark camera frame: icon, message and the way back on.
 * The first action is the lime accent button; any others are secondary. */
export function CameraBlocked({ title, message, actions }: { title?: string; message: string; actions: PanelAction[] }) {
  const { colors } = useTheme();
  return <View testID="camera-blocked" accessibilityLiveRegion="polite" style={styles.column}>
    {/* Forest green, not a translucent black: it has to show on the black camera frame. */}
    <View testID="camera-blocked-icon" style={[styles.icon, { backgroundColor: colors.primary }]}>
      <Icon name="camera" size={28} color={colors.cameraInk} />
    </View>
    {title ? <Text accessibilityRole="header" allowFontScaling style={[styles.title, { color: colors.cameraInk }]}>{title}</Text> : null}
    <Text allowFontScaling style={[styles.message, { color: colors.cameraInk }]}>{message}</Text>
    {actions.map((action, index) => <View key={action.label} style={styles.action}>
      <Button variant={index === 0 ? 'accent' : 'secondary'} onPress={action.onPress}>{action.label}</Button>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  column: { alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingVertical: 28, width: '100%', maxWidth: 320, alignSelf: 'center' },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.heading, fontSize: 18, lineHeight: 24, textAlign: 'center' },
  message: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  action: { alignSelf: 'stretch' },
});
