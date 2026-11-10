# N8 integration draft

David owns routing. Mount the named `SettingsScreen` and `AboutScreen` exports
under the settings/about routes; this task deliberately adds no route files.

- N17: pass `currentLanguage={getLanguage()}` and `setLanguage={setLanguage}`
  from `src/copy/lang`. N2 and N17 need their copy files reconciled first.
  N17's current native setter is a no-op; enable selection only on platforms
  with an implemented setter. Until supplied, language choices are disabled
  and N2's pending copy is shown. A storage failure keeps the chosen state.
- N4: pass `tierPalette` to `AboutScreen`, mapping the five keys `excellent`,
  `good`, `fair`, `poor`, `bad` to colors returned by the production `tierFor`.
  N4 is absent here, so the five labels render without invented colors or
  score ranges. Score band pills require the approved N4 ranges at integration.
- N10: pass `resetOnboarding` only when the real onboarding store exists.
  The row is hidden otherwise. The callback owns store reset and navigation.
- `ThemeProvider` and `InstallPromptProvider` must wrap the route, as in the
  existing application shell. Unsupported/installed platforms disable install;
  iOS shows the existing manual installation guidance when pressed.
- History deletion calls the real `clearHistory` store only after confirmation.
  Errors retain the dialog for retry; no queue or published contribution is removed.
- About links to `/method` and the existing Open Food Facts public source.
  Other source-specific labels are absent from N2; this task does not alter copy.

Pending acceptance: N17/N4/N10 integration, Claude cross-review, physical iPhone
and Android app/browser checks in dark mode and at 200% font size, human merge.

Web accessibility DOM regressions (actual RNW buttons and modal):
`pnpm --filter mobile exec jest --config src/features/settings/jest.dom.config.cjs --runInBand`.
The separate web preset avoids the native Jest window bootstrap conflict.
