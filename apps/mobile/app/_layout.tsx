import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Manrope_500Medium,Manrope_600SemiBold,Manrope_700Bold } from '@expo-google-fonts/manrope';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider,useTheme } from '../src/theme/useTheme';
import { ToastProvider } from '../src/ui/Toast';
function Navigation(){const {isDark,colors}=useTheme();return <ToastProvider><StatusBar style={isDark?'light':'dark'}/><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:colors.ground},animation:'none'}}/></ToastProvider>;}
export default function Layout(){useFonts({Manrope_500Medium,Manrope_600SemiBold,Manrope_700Bold,BricolageGrotesque_700Bold});return <SafeAreaProvider><ThemeProvider><Navigation/></ThemeProvider></SafeAreaProvider>;}
