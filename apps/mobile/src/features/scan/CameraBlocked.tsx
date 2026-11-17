import { StyleSheet, Text, View } from 'react-native';
import { Button, Icon } from '../../ui';
import { fonts } from '../../theme/tokens';
import { depth } from '../../theme/depth';
import { useTheme } from '../../theme/useTheme';
import type { PanelAction } from '../capture/StatusPanel';

/** A camera that is off: icon, message and the way back on, drawn straight in the scanner frame, which turns into an ivory inset well.
 * The first action is the raised forest primary button; any others are raised ivory secondary. */
export function CameraBlocked({ title, message, actions }: { title?: string; message: string; actions: PanelAction[] }) {
  const { colors } = useTheme();
  return <View testID="camera-blocked" accessibilityLiveRegion="polite" style={styles.column}>
    <View testID="camera-blocked-icon" style={[styles.icon, depth.sageTile]}>
      <Icon name="camera" size={28} color={colors.primary} />
    </View>
    {title ? <Text accessibilityRole="header" allowFontScaling style={[styles.title, { color: colors.ink }]}>{title}</Text> : null}
    <Text allowFontScaling style={[styles.message, { color: colors.ink }]}>{message}</Text>
    {actions.map((action, index) => <View key={action.label} style={styles.action}>
      <Button variant={index === 0 ? 'primary' : 'secondary'} onPress={action.onPress}>{action.label}</Button>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  column: { alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingVertical: 28, width: '100%', maxWidth: 340, alignSelf: 'center' },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 28, textAlign: 'center' },
  message: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  action: { alignSelf: 'stretch' },
});
