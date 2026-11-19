import { UpdateBanner } from '../src/ui/UpdateBanner';
import { InstallPromptProvider } from '../src/lib/installPrompt';
import { useEffect } from 'react';
import { StartupGate } from '../src/features/startup/StartupGate';
import { scheduleScannerPreload } from '../src/features/scan/scannerStartup';
import { useQueueFlush } from '../src/features/offline/useQueueFlush';
import { Stack, usePathname } from 'expo-router';
import { EdgeSwipeBack } from '../src/shared/EdgeSwipeBack';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ScreenSafeArea as SafeAreaView } from '../src/shared/ScreenSafeArea';
import { ThemeProvider,useTheme } from '../src/theme/useTheme';
import { ToastProvider } from '../src/ui/Toast';
import { installErrorReporter, setErrorScreen } from '../src/lib/errorReporter';
function QueueListener(){useQueueFlush();return null;}
function Diagnostics(){const path=usePathname();useEffect(()=>{setErrorScreen(path);installErrorReporter();},[path]);return null;}
const actionRoutes = new Set(['/capture', '/scan', '/identify', '/add', '/add/review']);
function Navigation(){const pathname=usePathname();const {colors}=useTheme();return <ToastProvider><Diagnostics/><QueueListener/><StatusBar style="dark"/><EdgeSwipeBack><Stack screenLayout={({children})=>actionRoutes.has(pathname)?<SafeAreaView edges={['top','left','right','bottom']} style={{flex:1,backgroundColor:colors.ground}}>{children}</SafeAreaView>:children} screenOptions={{headerShown:false,contentStyle:{backgroundColor:colors.ground},animation:'none'}}/></EdgeSwipeBack><UpdateBanner/></ToastProvider>;}
export default function Layout(){useEffect(scheduleScannerPreload, []);const [fontsLoaded,fontError]=useFonts({Inter_300Light,Inter_400Regular,Inter_500Medium,Inter_600SemiBold});return <SafeAreaProvider><ThemeProvider><InstallPromptProvider><StartupGate ready={fontsLoaded} error={fontError}>{(fontsLoaded||fontError)&&<Navigation/>}</StartupGate></InstallPromptProvider></ThemeProvider></SafeAreaProvider>;}
