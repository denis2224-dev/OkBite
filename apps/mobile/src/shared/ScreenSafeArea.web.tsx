import { useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type SafeAreaViewProps } from 'react-native-safe-area-context';
import { spacing } from '../theme/tokens';

export function ScreenSafeArea({ style, edges, ...props }: SafeAreaViewProps) {
 const insets = useSafeAreaInsets();
 const { width, height } = useWindowDimensions();
 const topEdge = edges as { top?: string } | undefined;
 const hasTop = !edges || (Array.isArray(edges) ? edges.includes('top') : topEdge?.top !== undefined && topEdge.top !== 'off');
 // Phone-shaped web previews draw the cutout but can report zero CSS safe-area insets.
 // Real device insets take precedence, so this clearance is never added twice.
 const phonePreview = width >= 360 && width <= 430 && height > width;
 const previewTop = hasTop && phonePreview && insets.top === 0 ? spacing.phonePreviewTop : 0;
 return <SafeAreaView {...props} edges={edges} style={[style, previewTop > 0 && { paddingTop: previewTop }]} />;
}
