import { Text, type TextProps } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { fonts, typeScale } from '../theme/tokens';
type Step = keyof typeof typeScale;
function header(step: Step) {
 return function Header({ style, ...props }: TextProps) {
  const { colors } = useTheme();
  return <Text {...props} accessibilityRole="header" allowFontScaling style={[{ fontFamily: fonts.heading, ...typeScale[step], letterSpacing: step === 'display' ? -0.3 : 0, color: colors.ink }, style]} />;
 };
}
export function Body({style,...props}:TextProps) {const {colors}=useTheme();return <Text {...props} allowFontScaling style={[{fontFamily:fonts.body,...typeScale.body,color:colors.ink},style]}/>;}
/** Muted small text for notes, sources and disclaimers. */
export function Caption({style,...props}:TextProps) {const {colors}=useTheme();return <Text {...props} allowFontScaling style={[{fontFamily:fonts.body,...typeScale.caption,color:colors.muted},style]}/>;}
/** Screen titles (30/36). */
export const Heading = header('display');
/** Card titles (20/26). */
export const Title = header('title');
/** Card questions and section headings (19/25). */
export const Section = header('section');
