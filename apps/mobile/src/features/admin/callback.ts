import * as Linking from 'expo-linking';
let consumed = false;
export async function consumeInitialAuthUrl(): Promise<string | null> {
  if (consumed) return null;
  consumed = true;
  return Linking.getInitialURL();
}
