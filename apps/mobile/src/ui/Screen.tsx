import { spacing } from '../theme/tokens';
import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { ScreenSafeArea as SafeAreaView } from '../shared/ScreenSafeArea';
import { useTheme } from '../theme/useTheme';
import { Title } from './Typography';
import { BackButton } from './BackButton';
/** `footer` stays fixed under the scrolling content, above the bottom safe area. */
export function Screen({ title, back = true, footer, children }: PropsWithChildren<{ title?: string; back?: boolean; footer?: ReactNode }>) {
 const { colors } = useTheme();
 return <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }} edges={['top','bottom','left','right']}>
  <View style={{ flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
   {title && <View style={{ minHeight: 64, paddingHorizontal: 16, paddingTop: spacing.headerTop, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    {back && <BackButton />}<Title style={{ flex: 1 }}>{title}</Title>
   </View>}
   <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: title ? 4 : 12, paddingBottom: 24, gap: 16 }}>{children}</ScrollView>
   {footer ? <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>{footer}</View> : null}
  </View>
 </SafeAreaView>;
}
