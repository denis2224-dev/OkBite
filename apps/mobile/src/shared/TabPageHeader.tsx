import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing } from '../theme/tokens';
import { useHomeTheme } from '../theme/home';
import { BackButton } from '../ui/BackButton';

export function TabPageHeader({ title, subtitle, action, back = false }: { title: string; subtitle?: string; action?: ReactNode; back?: boolean }) {
 const t = useHomeTheme();
 return <View style={styles.header}>
  <View style={styles.row}>
   {back && <BackButton/>}
   <Text accessibilityRole="header" style={[styles.title, {fontFamily:t.fonts.heading,color:t.colors.ink}]}>{title}</Text>
   {action}
  </View>
  <Text style={[styles.subtitle, {fontFamily:t.fonts.body,color:t.colors.muted}]}>{subtitle}</Text>
 </View>;
}
const styles=StyleSheet.create({
 header:{paddingTop:spacing.headerTop,paddingHorizontal:16,paddingBottom:8},
 row:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8},
 title:{flex:1,minWidth:0,fontSize:22,lineHeight:31.9,letterSpacing:-0.22},
 subtitle:{minHeight:18.85,fontSize:13,lineHeight:18.85},
});
