import type { PropsWithChildren } from 'react';
import { ScrollView,View,Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../theme/useTheme';
import { Heading } from './Typography';
import { Icon } from './Icon';
import { ro } from '../copy/ro';
export function Screen({title,back,children}:PropsWithChildren<{title?:string;back?:boolean}>){const {colors}=useTheme();return <SafeAreaView style={{flex:1,backgroundColor:colors.ground}} edges={['top','left','right']}><View style={{flex:1,width:'100%',maxWidth:480,alignSelf:'center'}}>{title&&<View style={{paddingHorizontal:24,paddingTop:12,paddingBottom:16,flexDirection:'row',alignItems:'center',gap:8}}>{back&&<Pressable accessibilityRole="button" accessibilityLabel={ro.app.back} onPress={()=>router.canGoBack()?router.back():router.replace('/')} style={{minHeight:48,minWidth:40,justifyContent:'center'}}><Icon name="back" color={colors.ink}/></Pressable>}<Heading style={{fontSize:23,flex:1}}>{title}</Heading></View>}<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:24,paddingTop:title?4:12,paddingBottom:40,gap:20}}>{children}</ScrollView></View></SafeAreaView>;}
