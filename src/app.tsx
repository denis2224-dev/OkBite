import { light } from "./core/theme/colors";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { ro } from "./core/constants/strings_ro";
import { WebStyles } from "./shared/widgets/web_styles";
import { useFonts } from "expo-font";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "./core/theme/app_theme";
import { useQueueFlush } from "./core/services/connectivity_service";
import { ToastProvider } from "./shared/widgets/toast";
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
    Manrope_500Medium: require("../assets/fonts/Manrope-Medium.ttf"),
    Manrope_600SemiBold: require("../assets/fonts/Manrope-SemiBold.ttf"),
    Manrope_700Bold: require("../assets/fonts/Manrope-Bold.ttf"),
    BricolageGrotesque_700Bold: require("../assets/fonts/BricolageGrotesque-Bold.ttf"),
  });
  if (!loaded && !error)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: light.ground,
        }}
      >
        <ActivityIndicator
          accessibilityLabel={ro.app.loading}
          color={light.primary}
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
