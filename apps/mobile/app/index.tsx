import { APP_NAME } from '@okbite/shared';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';

export default function Index() {
  const dark = useColorScheme() === 'dark';
  return (
    <View style={[styles.screen, { backgroundColor: dark ? '#11291E' : '#FAF8F2' }]}>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: dark ? '#FAF8F2' : '#1F4A35' }]}
      >
        {APP_NAME}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center' },
});
