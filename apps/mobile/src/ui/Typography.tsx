import { Text, type TextProps } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { fonts } from '../theme/tokens';
export function Body({style,...props}:TextProps) {const {colors}=useTheme();return <Text {...props} allowFontScaling style={[{fontFamily:fonts.body,fontSize:15,lineHeight:23,color:colors.ink},style]}/>;}
export function Heading({style,...props}:TextProps) {const {colors}=useTheme();return <Text {...props} accessibilityRole="header" allowFontScaling style={[{fontFamily:fonts.heading,fontSize:25,lineHeight:30,color:colors.ink},style]}/>;}
