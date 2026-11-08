import { spacing } from '../theme/tokens';
import type { PropsWithChildren } from 'react';
import { ScrollView, View } from 'react-native';
import { ScreenSafeArea as SafeAreaView } from '../shared/ScreenSafeArea';
import { useTheme } from '../theme/useTheme';
import { Heading } from './Typography';
import { BackButton } from './BackButton';
export function Screen({ title, back = true, children }: PropsWithChildren<{ title?: string; back?: boolean }>) {
 const { colors } = useTheme();
 return <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }} edges={['top','bottom','left','right']}>
  <View style={{ flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
   {title && <View style={{ minHeight: 64, paddingHorizontal: 16, paddingTop: spacing.headerTop, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    {back && <BackButton />}<Heading style={{ fontSize: 22, lineHeight: 29, flex: 1 }}>{title}</Heading>
   </View>}
   <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: title ? 4 : 12, paddingBottom: 24, gap: 16 }}>{children}</ScrollView>
  </View>
 </SafeAreaView>;
}
