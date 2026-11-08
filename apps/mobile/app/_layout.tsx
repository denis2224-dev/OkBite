import { spacing } from '../src/theme/tokens';
import { useEffect } from 'react';
import { StartupGate } from '../src/features/startup/StartupGate';
import { useQueueFlush } from '../src/features/offline/useQueueFlush';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Manrope_400Regular,Manrope_500Medium,Manrope_600SemiBold,Manrope_700Bold,Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { BricolageGrotesque_700Bold,BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ScreenSafeArea as SafeAreaView } from '../src/shared/ScreenSafeArea';
import { View } from 'react-native';
import { BackButton } from '../src/ui/BackButton';
import { ThemeProvider,useTheme } from '../src/theme/useTheme';
import { ToastProvider } from '../src/ui/Toast';
import { installErrorReporter, setErrorScreen } from '../src/lib/errorReporter';
function QueueListener(){useQueueFlush();return null;}
function Diagnostics(){const path=usePathname();useEffect(()=>{setErrorScreen(path);installErrorReporter();},[path]);return null;}
const actionRoutes = new Set(['/capture', '/scan', '/identify', '/add', '/add/review']);
function ActionHeader() {
 const {colors}=useTheme();
 return <SafeAreaView edges={['top','left','right']} style={{backgroundColor:colors.ground}}>
  <View style={{minHeight:64,paddingHorizontal:10,paddingTop:spacing.headerTop,paddingBottom:8,flexDirection:'row',alignItems:'center',gap:8}}>
   <View style={{flex:1}}><BackButton/></View>
  </View>
 </SafeAreaView>;
}
function Navigation(){const pathname=usePathname();const {isDark,colors}=useTheme();return <ToastProvider><Diagnostics/><QueueListener/><StatusBar style={isDark?'light':'dark'}/><Stack screenLayout={({children})=>actionRoutes.has(pathname)?<SafeAreaView edges={['left','right','bottom']} style={{flex:1,backgroundColor:colors.ground}}>{children}</SafeAreaView>:children} screenOptions={{headerShown:actionRoutes.has(pathname),header:ActionHeader,contentStyle:{backgroundColor:colors.ground},animation:'none'}}/></ToastProvider>;}
export default function Layout(){const [fontsLoaded,fontError]=useFonts({Manrope_400Regular,Manrope_500Medium,Manrope_600SemiBold,Manrope_700Bold,Manrope_800ExtraBold,BricolageGrotesque_700Bold,BricolageGrotesque_800ExtraBold});return <SafeAreaProvider><ThemeProvider><StartupGate ready={fontsLoaded} error={fontError}>{(fontsLoaded||fontError)&&<Navigation/>}</StartupGate></ThemeProvider></SafeAreaProvider>;}
