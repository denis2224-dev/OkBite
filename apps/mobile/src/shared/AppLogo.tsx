import { Image, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
export function AppLogo() {
 const { colors } = useTheme();
 return <View style={{ width: 38, height: 38, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.hero }}>
  <Image source={require('../../assets/brand/app-icon.png')} style={{ width: 38, height: 38 }} resizeMode="cover" accessible={false} />
 </View>;
}
