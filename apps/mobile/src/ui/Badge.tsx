import { View } from 'react-native';
import type { PropsWithChildren } from 'react';
import { Body } from './Typography';
import { useTheme } from '../theme/useTheme';
import { radii } from '../theme/tokens';
export function Badge({children,tone='info'}:PropsWithChildren<{tone?:'unverified'|'info'}>){const {colors}=useTheme();return <View style={{alignSelf:'flex-start',backgroundColor:tone==='unverified'?colors.mediumBg:colors.cream,borderRadius:radii.small,paddingHorizontal:10,paddingVertical:5}}><Body style={{fontSize:12,lineHeight:18,color:tone==='unverified'?colors.medium:colors.primary}}>{children}</Body></View>;}
