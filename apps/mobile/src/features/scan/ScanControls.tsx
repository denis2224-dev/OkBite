import { StyleSheet, View } from 'react-native';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { ScreenSafeArea } from '../../shared/ScreenSafeArea';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { ScanIcon, type ScanIconName } from './ScanIcon';

type Props = { torch: boolean; onTorch?: () => void; closeUp: boolean; onCloseUp?: () => void };

/** Light and close-up: two round buttons over the top-left of the camera. Off is dark glass, on is white; only colours change. */
export function ScanControls({ torch, onTorch, closeUp, onCloseUp }: Props) {
  const { colors } = useTheme();
  const button = (icon: ScanIconName, label: string, on: boolean, onPress: () => void) =>
    <Pressable key={icon} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} onPress={onPress}
      style={[styles.round, { backgroundColor: on ? colors.cameraInk : colors.cameraOverlay }]}>
      <ScanIcon name={icon} size={22} color={on ? colors.primary : colors.cameraInk} />
    </Pressable>;
  return <ScreenSafeArea edges={['top', 'left']} pointerEvents="box-none" style={styles.corner}>
    <View style={styles.stack}>
      {onTorch ? button('flash', torch ? ro.scan.flashOff : ro.scan.flashOn, torch, onTorch) : null}
      {onCloseUp ? button('closeUp', closeUp ? ro.scan.closeUpOff : ro.scan.closeUpOn, closeUp, onCloseUp) : null}
    </View>
  </ScreenSafeArea>;
}

const styles = StyleSheet.create({
  corner: { position: 'absolute', top: 0, left: 0 },
  stack: { gap: 10, paddingTop: 12, paddingLeft: 16 },
  round: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
});
