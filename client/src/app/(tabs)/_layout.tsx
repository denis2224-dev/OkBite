import { Tabs } from "expo-router";
import { useTheme } from "../../hooks/useTheme";
import { Icon, type IconName } from "../../components/Icon";
import { fonts } from "../../theme/tokens";
import { ro } from "../../copy/ro";
export default function TabLayout() {
  const { colors } = useTheme();
  const tabs: [string, string, IconName][] = [
    ["index", ro.nav.home, "home"],
    ["compare", ro.nav.compare, "compare"],
    ["history", ro.nav.history, "history"],
  ];
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          minHeight: 76,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: 12,
          marginTop: 4,
        },
      }}
    >
      {tabs.map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarAccessibilityLabel: title,
            tabBarIcon: ({ color }) => <Icon name={icon} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
