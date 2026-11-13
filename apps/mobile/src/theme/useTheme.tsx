import { createContext, useContext, type PropsWithChildren } from 'react';
import { light } from './tokens';

/** OkBite is light only: the phone's dark setting is ignored and there is no theme choice. */
const theme = { colors: light };
const Context = createContext(theme);
export function ThemeProvider({ children }: PropsWithChildren) {
 return <Context.Provider value={theme}>{children}</Context.Provider>;
}
export const useTheme = () => useContext(Context);
