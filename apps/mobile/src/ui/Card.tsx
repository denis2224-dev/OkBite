import { View,type ViewProps } from 'react-native';
import { useTheme } from '../theme/useTheme';
export function Card({style,...props}:ViewProps){const {colors}=useTheme();return <View {...props} style={[{backgroundColor:colors.surface,borderRadius:20,borderWidth:1,borderColor:colors.border,padding:16,gap:12},style]}/>;}
