import { useLayoutEffect } from "react";

export function focusActiveScreen() {
  if (typeof document === "undefined") return;
  const hidden = '[aria-hidden="true"],[inert]';
  const active = document.activeElement;
  if (
    active instanceof HTMLElement &&
    active !== document.body &&
    !active.closest(hidden)
  )
    return;

  const panels = Array.from(
    document.querySelectorAll<HTMLElement>('main,[role="main"]'),
  );
  const current = panels.reverse().find((panel) => !panel.closest(hidden));
  if (current) current.focus({ preventScroll: true });
  else if (active instanceof HTMLElement && active.closest(hidden))
    active.blur();
}

export function observeScreenFocus() {
  const observer = new MutationObserver(focusActiveScreen);
  observer.observe(document.getElementById("root") ?? document.body, {
    attributes: true,
    attributeFilter: ["aria-hidden", "inert"],
    subtree: true,
  });
  return () => observer.disconnect();
}

export function useNavigationFocus() {
  // Run after visibility changes, before the browser updates accessibility.
  useLayoutEffect(observeScreenFocus, []);
}
