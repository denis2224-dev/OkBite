import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  type PropsWithChildren,
} from "react";
import { View, Pressable } from "react-native";
import { Body } from "./Typography";
import { Icon } from "./Icon";
import { useTheme } from "../theme/useTheme";
import { ro } from "../copy/ro";
type Action = { label: string; onPress: () => void };
const Context = createContext<(message: string, action?: Action) => void>(
  () => {},
);
export function ToastProvider({ children }: PropsWithChildren) {
  const [notice, setNotice] = useState<{ message: string; action?: Action }>({
    message: "",
  });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { colors } = useTheme();
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = useCallback((message: string, action?: Action) => {
    clearTimeout(timer.current);
    setNotice({ message, action });
    if (!action)
      timer.current = setTimeout(() => setNotice({ message: "" }), 4000);
  }, []);
  return (
    <Context.Provider value={show}>
      {children}
      {!!notice.message && (
        <View
          style={{
            position: "absolute",
            bottom: 90,
            alignSelf: "center",
            maxWidth: 440,
            margin: 20,
            borderRadius: 16,
            padding: 16,
            backgroundColor: colors.primary,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Body
              accessibilityLiveRegion="polite"
              style={{ color: colors.onPrimary, flex: 1 }}
            >
              {notice.message}
            </Body>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ro.app.close}
              onPress={() => setNotice({ message: "" })}
              style={{
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="close" color={colors.onPrimary} size={18} />
            </Pressable>
          </View>
          {notice.action && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={notice.action.label}
              onPress={() => {
                notice.action?.onPress();
                setNotice({ message: "" });
              }}
              style={{ minHeight: 48, justifyContent: "center" }}
            >
              <Body
                style={{
                  color: colors.onPrimary,
                  textDecorationLine: "underline",
                  fontWeight: "700",
                }}
              >
                {notice.action.label}
              </Body>
            </Pressable>
          )}
        </View>
      )}
    </Context.Provider>
  );
}
export function useToast() {
  return useContext(Context);
}
