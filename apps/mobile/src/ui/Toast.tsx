import { createContext, useContext, useState, useRef, useEffect, useCallback, type PropsWithChildren } from 'react';
import { View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { fonts } from '../theme/tokens';
import { PressableOpacity as Pressable } from '../shared/PressableOpacity';
import { Body } from './Typography';
import { useTheme } from '../theme/useTheme';
type Action = { label: string; onPress: () => void };
const Context = createContext((_message: string, _action?: Action) => {});
export function ToastProvider({ children }: PropsWithChildren) {
  const [notice, setNotice] = useState<{ message: string; action?: Action }>();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { colors } = useTheme();
  // Clear the floating tab bar (about 84 pt) and the home indicator.
  const bottom = useContext(SafeAreaInsetsContext)?.bottom ?? 0;
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = useCallback((message: string, action?: Action) => {
    clearTimeout(timer.current);
    setNotice({ message, action });
    timer.current = setTimeout(() => setNotice(undefined), action ? 8000 : 4000);
  }, []);
  return <Context.Provider value={show}>{children}{notice &&
    <View testID="toast" pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 84 + bottom, paddingHorizontal: 16, alignItems: 'center' }}>
     <View accessibilityLiveRegion="polite" style={{ width: '100%', maxWidth: 440, borderRadius: 16, paddingVertical: 8, paddingLeft: 16, paddingRight: 8, minHeight: 56, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, backgroundColor: colors.primary }}>
      <Body style={{ flex: 1, minWidth: 160, paddingVertical: 8, color: colors.onPrimary }}>{notice.message}</Body>
      {notice.action && <Pressable accessibilityRole="button" accessibilityLabel={notice.action.label} onPress={() => { setNotice(undefined); notice.action?.onPress(); }} style={{ minHeight: 44, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center', backgroundColor: colors.onPrimary }}>
        <Body style={{ color: colors.primary, fontFamily: fonts.bold }}>{notice.action.label}</Body>
      </Pressable>}
     </View>
    </View>}
  </Context.Provider>;
}
export function useToast() { return useContext(Context); }
