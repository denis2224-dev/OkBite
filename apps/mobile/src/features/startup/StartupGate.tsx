import { useEffect, useState, type PropsWithChildren } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { light } from '../../theme/tokens';
import { ro } from '../../copy/ro';

/** Artwork is static: no animation or motion preference override is needed. */
export function StartupGate({ ready, error, children }: PropsWithChildren<{ ready: boolean; error?: Error | null }>) {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setElapsed(true), 500);
    return () => clearTimeout(timer);
  }, []);
  const loading = !elapsed || (!ready && !error);
  return <View style={styles.root}>
    <View style={styles.root} accessibilityElementsHidden={loading} importantForAccessibility={loading ? 'no-hide-descendants' : 'auto'}>
      {children}
    </View>
    {loading && <View style={[styles.overlay,{backgroundColor:light.ground}]} accessible accessibilityRole="progressbar" accessibilityLabel={ro.app.loading}>
      <StatusBar style="dark" />
      <Image testID="startup-background" source={require('../../../assets/brand/android-background.png')} style={styles.background} resizeMode="cover" accessible={false} />
      <Image testID="startup-artwork" source={require('../../../assets/brand/startup-screen.png')} style={styles.artwork} resizeMode="contain" accessible={false} />
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  // The opaque artwork has a cream canvas in both themes; fill wide/tall viewports with the matching brand asset.
  background: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%' },
  artwork: { width: '100%', height: '100%' },
});
