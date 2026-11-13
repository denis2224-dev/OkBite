import { Modal, ScrollView, View } from 'react-native';
import type { Product } from '@okbite/shared';
import { Button } from '../../ui';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';
import { PortionTable } from './PortionTable';

/** Opened from the "Porție" tile: the same portion table as further down, in a sheet. */
export function PortionSheet({ product, onClose }: { product: Product; onClose: () => void }) {
  const { colors } = useTheme();
  return <Modal transparent animationType="none" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 480, alignSelf: 'center', gap: 8, padding: 16, backgroundColor: colors.ground, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <PortionTable product={product} />
          <Button variant="secondary" onPress={onClose}>{ro.nav.close}</Button>
        </View>
      </ScrollView>
    </View>
  </Modal>;
}
