import { spacing } from '../theme/tokens';
import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { ScreenSafeArea as SafeAreaView } from '../shared/ScreenSafeArea';
import { useTheme } from '../theme/useTheme';
import { Title } from './Typography';
import { IconButton } from './IconButton';
import { ro } from '../copy/ro';
/** `footer` stays fixed under the scrolling content, above the bottom safe area. */
/** Swiping from the left edge goes back (see shared/EdgeSwipeBack); `onBack` also shows a back icon button. */
export function Screen({ title, footer, onBack, children }: PropsWithChildren<{ title?: string; footer?: ReactNode; onBack?: () => void }>) {
 const { colors } = useTheme();
 return <SafeAreaView style={{ flex: 1, backgroundColor: colors.ground }} edges={['top','bottom','left','right']}>
  <View style={{ flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
   {(title || onBack) && <View style={{ minHeight: 64, paddingHorizontal: 16, paddingTop: spacing.headerTop, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    {onBack ? <IconButton icon="back" label={ro.app.back} onPress={onBack} /> : null}
    {title ? <Title style={{ flex: 1 }}>{title}</Title> : null}
   </View>}
   <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: title ? 4 : 12, paddingBottom: 24, gap: 16 }}>{children}</ScrollView>
   {footer ? <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>{footer}</View> : null}
  </View>
 </SafeAreaView>;
}
