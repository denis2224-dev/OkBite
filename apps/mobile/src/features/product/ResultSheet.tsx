import { useEffect, useRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { Product, ScoreResult } from '@okbite/shared';
import { Button, IconButton } from '../../ui';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { depth } from '../../theme/depth';
import { ResultView } from './ResultView';

export function ResultSheet({ product, score, onClose }: { product: Product; score: ScoreResult; onClose: () => void }) {
  const { colors } = useTheme();
  const sheet = useRef<{ focus?: () => void } | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => sheet.current?.focus?.());
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    const webWindow = typeof window === 'undefined' ? undefined : window;
    if (!webWindow?.addEventListener) return;
    webWindow.addEventListener('keydown', closeOnEscape);
    return () => webWindow.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return <Modal accessibilityLabel={product.name} transparent animationType="none" onRequestClose={onClose}>
    <View style={[styles.overlay, { backgroundColor: colors.scrim }]}>
      <Pressable testID="result-sheet-backdrop" accessible={false} onPress={onClose} style={StyleSheet.absoluteFill} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View ref={node => { sheet.current = node as unknown as { focus?: () => void } | null; }} testID="result-sheet" accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.ground }]}>
          <View style={styles.actions}>
            <IconButton icon="close" label={ro.app.close} onPress={onClose} />
          </View>
          <ResultView product={product} score={score} />
          <Button variant="secondary" onPress={() => router.push(`/product/${product.id}`)}>{ro.app.open}</Button>
        </View>
      </ScrollView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  scroll: { flexGrow: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 16, padding: 20, paddingBottom: 28, borderTopLeftRadius: 28, borderTopRightRadius: 28, ...depth.raised },
  actions: { alignItems: 'flex-end' },
});
