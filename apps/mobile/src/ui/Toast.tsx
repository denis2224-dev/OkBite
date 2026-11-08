import { createContext, useContext, useState, useRef, useEffect, useCallback, type PropsWithChildren } from 'react';
import { View } from 'react-native';
import { PressableOpacity as Pressable } from '../shared/PressableOpacity';
import { Body } from './Typography';
import { useTheme } from '../theme/useTheme';
type Action = { label: string; onPress: () => void };
const Context = createContext((_message: string, _action?: Action) => {});
export function ToastProvider({ children }: PropsWithChildren) {
  const [notice, setNotice] = useState<{ message: string; action?: Action }>();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { colors } = useTheme();
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = useCallback((message: string, action?: Action) => {
    clearTimeout(timer.current);
    setNotice({ message, action });
    timer.current = setTimeout(() => setNotice(undefined), action ? 8000 : 4000);
  }, []);
  return <Context.Provider value={show}>{children}{notice &&
    <View accessibilityLiveRegion="polite" style={{ position: 'absolute', bottom: 90, alignSelf: 'center', maxWidth: 440, margin: 20, borderRadius: 16, padding: 16, backgroundColor: colors.primary }}>
      <Body style={{ color: colors.onPrimary }}>{notice.message}</Body>
      {notice.action && <Pressable accessibilityRole="button" accessibilityLabel={notice.action.label} onPress={() => { setNotice(undefined); notice.action?.onPress(); }} style={{ minHeight: 48, paddingVertical: 12 }}>
        <Body style={{ color: colors.onPrimary, textDecorationLine: 'underline' }}>{notice.action.label}</Body>
      </Pressable>}
    </View>}
  </Context.Provider>;
}
export function useToast() { return useContext(Context); }
