import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing } from '../theme/tokens';
import { useHomeTheme } from '../theme/home';
import { IconButton } from '../ui/IconButton';
import { ro } from '../copy/ro';

/** `onBack` adds a back icon button left of the title (pages outside the tab bar); tab roots leave it out. */
export function TabPageHeader({ title, subtitle, action, onBack }: { title: string; subtitle?: string; action?: ReactNode; onBack?: () => void }) {
 const t = useHomeTheme();
 // Without a subtitle, a little more room keeps the first card off the title row (and its action pill).
 return <View style={[styles.header, !subtitle && styles.titleOnly]}>
  <View style={styles.row}>
   {onBack ? <IconButton icon="back" label={ro.app.back} onPress={onBack} /> : null}
   <Text accessibilityRole="header" style={[styles.title, {fontFamily:t.fonts.heading,color:t.colors.ink}]}>{title}</Text>
   {action}
  </View>
  {subtitle ? <Text testID="tab-page-subtitle" style={[styles.subtitle, {fontFamily:t.fonts.body,color:t.colors.muted}]}>{subtitle}</Text> : null}
 </View>;
}
const styles=StyleSheet.create({
 header:{paddingTop:spacing.headerTop,paddingHorizontal:16,paddingBottom:8},
 titleOnly:{paddingBottom:16},
 row:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8},
 title:{flex:1,minWidth:0,fontSize:22,lineHeight:31.9,letterSpacing:-0.22},
 subtitle:{minHeight:18.85,fontSize:13,lineHeight:18.85},
});
