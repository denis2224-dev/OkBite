import { View } from 'react-native';
import type { Allergen } from '@okbite/shared';
import { Body } from './Typography';
import { useTheme } from '../theme/useTheme';
import { Icon } from './Icon';
export function AllergenChip({name}:{name:Allergen}){const {colors}=useTheme();return <View style={{maxWidth:'100%',flexShrink:1,flexDirection:'row',gap:6,alignItems:'center',paddingHorizontal:12,paddingVertical:8,borderRadius:12,backgroundColor:colors.warningBg}}><Icon name="alert" size={16} color={colors.warning}/><Body style={{flexShrink:1,color:colors.warning,fontWeight:'700'}}>{name}</Body></View>;}
