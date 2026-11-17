import { useState } from 'react';
import { Image, View } from 'react-native';
import type { Product } from '@okbite/shared';
import { Body } from '../../ui';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

/** The front photo at the top of the result; initials on a plain tile when there is none or it fails to load. */
export function ProductPhoto({ product }: { product: Pick<Product, 'name' | 'imageUrl'> }) {
  const { colors } = useTheme();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = product.imageUrl && product.imageUrl !== failedUrl ? product.imageUrl : null;
  return <View style={{ height: url ? 200 : 112, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
    {url
      ? <Image testID="product-photo" source={{ uri: url }} accessibilityLabel={product.name} resizeMode="contain"
        onError={() => setFailedUrl(url)} style={{ width: '100%', height: '100%' }} />
      // Decorative: the product name is read by the heading right below.
      : <View testID="product-photo-placeholder" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={{ width: 72, height: 72, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutralBg }}>
        <Body style={{ fontFamily: fonts.heading, fontSize: 26, lineHeight: 32, color: colors.muted }}>
          {product.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toLocaleUpperCase('ro')}
        </Body>
      </View>}
  </View>;
}
