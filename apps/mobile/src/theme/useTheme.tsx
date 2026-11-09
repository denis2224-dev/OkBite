import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { light, dark } from './tokens';
type Preference = 'system' | 'light' | 'dark';
const key = 'okbite.appearance';
const Context = createContext({ colors: light, isDark: false, preference: 'system' as Preference, setPreference: (_value: Preference) => {} });
export function ThemeProvider({ children }: PropsWithChildren) {
 const system = useColorScheme();
 const [preference, updatePreference] = useState<Preference>('system');
 const chosen = useRef(false);
 const pendingWrite = useRef(Promise.resolve());
 useEffect(() => {
  let active = true;
  void AsyncStorage.getItem(key).then(value => {
   if (active && !chosen.current && (value === 'light' || value === 'dark' || value === 'system')) updatePreference(value);
  }).catch(() => {});
  return () => { active = false; };
 }, []);
 const setPreference = useCallback((value: Preference) => {
  chosen.current = true;
  updatePreference(value);
  pendingWrite.current = pendingWrite.current.then(() => AsyncStorage.setItem(key, value)).catch(() => {});
 }, []);
 const isDark = preference === 'system' ? system === 'dark' : preference === 'dark';
 return <Context.Provider value={{ colors: isDark ? dark : light, isDark, preference, setPreference }}>{children}</Context.Provider>;
}
export const useTheme = () => useContext(Context);
