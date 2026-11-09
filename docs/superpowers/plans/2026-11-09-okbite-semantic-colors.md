# App-wide semantic color system

User-approved cream/forest/lime palette, applied to existing `apps/mobile` screens
on existing `ui-polish`, in `.worktrees/ui-semantic-colors`. Base includes the
phone camera/navigation and 500 ms startup fixes. No backend, copy, typography,
score logic, dependency or route changes.

- [x] Write failing contrast, disabled, hover, allergen/error and form-focus regressions.
- [x] Define semantic roles in `src/theme/tokens.ts`; retain compatible consumer aliases.
- [x] Apply roles to shared controls, neutral product/history/comparison surfaces,
  explicit allergen warnings, error/success/information states, and browser chrome.
- [x] Verify light/dark rendered pages, focus, full score notes at 200% text,
  camera recovery and navigation in WebKit and Chromium; inspect screenshots.
- [x] Address independent Codex review: accessible alert is on message text, never recovery buttons.
- [x] Final `pnpm check` and web/iOS/Android exports after review fixes.
  Browser suite: 25 passed, 1 skipped (WebKit synthetic-camera limitation).
  Existing lint baseline: 57 warnings, zero errors.
- [ ] Claude cross-review (CLI not signed in; user previously requested leaving it pending).
- [ ] Real iPhone and Android acceptance in native app and browser; human approval.

Contrast exception: supplied light secondary `#647168` on raised `#E8EEE4`
is 4.33:1. Unknown badges use supplied primary text `#20372C` instead; secondary
text remains unchanged on card/page surfaces. Hover/pressed shades reuse supplied
palette colors. Critical errors use error roles, never low-nutrition colors.

Future pages: use `useTheme`, `Button`, `ThemedTextInput`, `StatusPanel` and
`PressableOpacity`; do not introduce page-specific hex values. Keep score colors
on labelled scores and allergens explicit regardless of score. Camera overlays
retain legible fixed camera tokens rather than theme-dependent colors.
