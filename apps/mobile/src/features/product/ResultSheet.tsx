import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { Product, ScoreResult } from '@okbite/shared';
import { Body, Button, Icon, SwipeSheet } from '../../ui';
import { ro } from '../../copy/ro';
import { PressableOpacity } from '../../shared/PressableOpacity';
import { useTheme } from '../../theme/useTheme';
import { ResultView } from './ResultView';

type ResultSheetProps = {
  product: Product;
  score: ScoreResult;
  onClose: () => void;
  storageError?: boolean;
};

export function ResultSheet({ product, score, onClose, storageError }: ResultSheetProps) {
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

  return <SwipeSheet testID="result-sheet" label={product.name} backdropCloses onClose={onClose}>
    <View ref={node => { sheet.current = node as unknown as { focus?: () => void } | null; }} style={styles.body}>
      <View style={styles.actions}>
        <PressableOpacity accessibilityRole="button" accessibilityLabel={ro.app.close} onPress={onClose} style={[styles.close, { backgroundColor: colors.surface }]}>
          <Icon name="close" size={18} color={colors.ink} />
        </PressableOpacity>
      </View>
      {storageError && <Body accessibilityLiveRegion="polite">{ro.history.storageError}</Body>}
      <ResultView product={product} score={score} />
      <Button variant="secondary" onPress={() => router.push(`/product/${product.id}`)}>{ro.app.open}</Button>
    </View>
  </SwipeSheet>;
}

const styles = StyleSheet.create({
  body: { gap: 16 },
  actions: { alignItems: 'flex-end' },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
