import { useEffect } from 'react';
import { StartupGate } from '../src/features/startup/StartupGate';
import { useQueueFlush } from '../src/features/offline/useQueueFlush';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Manrope_500Medium,Manrope_600SemiBold,Manrope_700Bold } from '@expo-google-fonts/manrope';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider,useTheme } from '../src/theme/useTheme';
import { ToastProvider } from '../src/ui/Toast';
import { UpdateBanner } from '../src/ui/UpdateBanner';
import { installErrorReporter, setErrorScreen } from '../src/lib/errorReporter';
function QueueListener(){useQueueFlush();return null;}
function Diagnostics(){const path=usePathname();useEffect(()=>{setErrorScreen(path);installErrorReporter();},[path]);return null;}
function Navigation(){const {isDark,colors}=useTheme();return <ToastProvider><Diagnostics/><QueueListener/><StatusBar style={isDark?'light':'dark'}/><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:colors.ground},animation:'none'}}/><UpdateBanner/></ToastProvider>;}
export default function Layout(){const [fontsLoaded,fontError]=useFonts({Manrope_500Medium,Manrope_600SemiBold,Manrope_700Bold,BricolageGrotesque_700Bold});return <SafeAreaProvider><ThemeProvider><StartupGate ready={fontsLoaded} error={fontError}><Navigation/></StartupGate></ThemeProvider></SafeAreaProvider>;}
