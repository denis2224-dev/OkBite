import { useEffect } from 'react';
export function useDocumentTheme(dark: boolean, background: string) {
  useEffect(() => {
    const root = document.documentElement;
    const previous = { colorScheme: root.style.colorScheme, backgroundColor: root.style.backgroundColor };
    const bodyBackground = document.body.style.backgroundColor;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousMeta = meta?.content;
    document.body.style.backgroundColor = background;
    if (meta) meta.content = background;
    root.style.colorScheme = dark ? 'dark' : 'light';
    root.style.backgroundColor = background;
    return () => { Object.assign(root.style, previous); document.body.style.backgroundColor = bodyBackground;
      if (meta && previousMeta !== undefined) meta.content = previousMeta; };
  }, [dark, background]);
}
