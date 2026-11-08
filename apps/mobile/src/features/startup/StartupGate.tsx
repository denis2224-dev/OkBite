import { useEffect, useState, type PropsWithChildren } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { ro } from '../../copy/ro';

/** Artwork is static: no animation or motion preference override is needed. */
export function StartupGate({ ready, error, children }: PropsWithChildren<{ ready: boolean; error?: Error | null }>) {
  const {colors}=useTheme();
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setElapsed(true), 2500);
    return () => clearTimeout(timer);
  }, []);
  const loading = !elapsed || (!ready && !error);
  return <View style={styles.root}>
    <View style={styles.root} accessibilityElementsHidden={loading} importantForAccessibility={loading ? 'no-hide-descendants' : 'auto'}>
      {children}
    </View>
    {loading && <View style={[styles.overlay,{backgroundColor:colors.ground}]} accessible accessibilityRole="progressbar" accessibilityLabel={ro.app.loading}>
      <Image source={require('../../../assets/brand/startup-screen.png')} style={styles.artwork} resizeMode="contain" accessible={false} />
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  artwork: { width: '100%', height: '100%' },
});
