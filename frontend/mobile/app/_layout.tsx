import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { ro } from "../src/copy/ro";
import { WebStyles } from "../src/ui/WebStyles";
import { useFonts } from "expo-font";
import { Manrope_500Medium } from "@expo-google-fonts/manrope/500Medium";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope/600SemiBold";
import { Manrope_700Bold } from "@expo-google-fonts/manrope/700Bold";
import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque/700Bold";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../src/theme/useTheme";
import { useQueueFlush } from "../src/features/offline/useQueueFlush";
import { ToastProvider } from "../src/ui/Toast";
function QueueListener() {
  useQueueFlush();
  return null;
}
function Navigation() {
  const { isDark, colors } = useTheme();
  return (
    <ToastProvider>
      <WebStyles />
      <QueueListener />
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.ground },
          animation: "none",
        }}
      />
    </ToastProvider>
  );
}
export default function Layout() {
  const [loaded, error] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    BricolageGrotesque_700Bold,
  });
  if (!loaded && !error)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: "#F7F4EC",
        }}
      >
        <ActivityIndicator
          accessibilityLabel={ro.app.loading}
          color="#173A2A"
        />
      </View>
    );
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Navigation />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
