import { useTheme } from "../theme/useTheme";
export function WebStyles() {
  const { colors } = useTheme();
  return (
    <style>{`html,body,#root{min-height:100%;margin:0;background:${colors.ground}}body{color:${colors.ink}}:focus-visible{outline:3px solid ${colors.primary}!important;outline-offset:4px}input,textarea{font:inherit}::selection{background:${colors.accent};color:${colors.onAccent}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}`}</style>
  );
}
