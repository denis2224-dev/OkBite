import { View, useWindowDimensions } from 'react-native';
import Svg,{Circle} from 'react-native-svg';
import type { Grade } from '@okbite/shared';
import { useTheme } from '../theme/useTheme';
import { Body } from './Typography';
import { fonts } from '../theme/tokens';
import { ro } from '../copy/ro';
export function ScoreRing({score,grade}:{score:number|null;grade:Grade}){
 const {fontScale}=useWindowDimensions();const size=120*Math.max(1,fontScale);
 const {colors}=useTheme();const color=grade==='unavailable'?colors.muted:colors[grade];const c=2*Math.PI*48;
 return <View accessible accessibilityRole="image" accessibilityLabel={score===null?ro.result.scoreUnavailable:ro.score.ringLabel(score,grade)} style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}>
 <Svg width={size} height={size} viewBox="0 0 120 120" style={{position:'absolute'}} aria-hidden><Circle cx={60} cy={60} r={48} fill="none" stroke={colors.border} strokeWidth={8}/>{score!==null&&<Circle cx={60} cy={60} r={48} fill="none" stroke={color} strokeWidth={8} strokeDasharray={`${c*(score/100)} ${c}`} transform="rotate(-90 60 60)" strokeLinecap="round"/>}</Svg>
 <Body style={{fontFamily:fonts.heading,fontSize:37,lineHeight:42,color}}>{score??'—'}</Body><Body style={{fontSize:11,lineHeight:16,color:colors.muted}}>{score===null?ro.app.unavailable:ro.score.outOf}</Body></View>;
}
