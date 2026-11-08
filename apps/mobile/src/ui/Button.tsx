import { type PressableProps, View } from 'react-native';
import { PressableOpacity as Pressable } from '../shared/PressableOpacity';
import { useTheme } from '../theme/useTheme';
import { Body } from './Typography';
import { Icon,type IconName } from './Icon';
import { fonts } from '../theme/tokens';
type Props=PressableProps & {children:string;variant?:'primary'|'secondary'|'ghost'|'accent';icon?:IconName};
export function Button({children,variant='primary',icon,disabled,style,...props}:Props){
 const {colors}=useTheme(); const fg=variant==='primary'?colors.onPrimary:variant==='accent'?colors.onAccent:colors.ink;
 return <Pressable {...props} disabled={disabled} accessibilityRole="button" accessibilityLabel={props.accessibilityLabel??children} accessibilityState={{disabled:!!disabled}} style={state=>[{minHeight:52,borderRadius:16,paddingHorizontal:18,paddingVertical:14,justifyContent:'center',opacity:disabled?0.45:1,backgroundColor:variant==='primary'?colors.primary:variant==='accent'?colors.accent:variant==='secondary'?colors.soft:colors.transparent,borderWidth:variant==='secondary'?1:0,borderColor:colors.border},typeof style==='function'?style(state):style]}><View style={{flexDirection:'row',gap:10,alignItems:'center',justifyContent:'center'}}>{icon&&<Icon name={icon} color={fg}/>}<Body style={{color:fg,fontFamily:fonts.bold,textAlign:'center',flexShrink:1}}>{children}</Body></View></Pressable>;
}
