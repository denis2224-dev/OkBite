import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from "react";
import { useColorScheme } from "react-native";
import { light, dark } from "./colors";
type Preference = "system" | "light" | "dark";
const Context = createContext({
  colors: light,
  isDark: false,
  preference: "system" as Preference,
  setPreference: (_value: Preference) => {},
});
export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [preference, setPreference] = useState<Preference>("system");
  const isDark =
    preference === "system" ? system === "dark" : preference === "dark";
  return (
    <Context.Provider
      value={{
        colors: isDark ? dark : light,
        isDark,
        preference,
        setPreference,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useTheme = () => useContext(Context);
