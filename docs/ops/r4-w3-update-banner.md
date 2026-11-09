# R4-W3 — update banner evidence

Client contract: `okbite:sw-update` marks an update pending. The shell displays
the Romanian update card on safe routes. `/capture`, `/scan`, `/identify`,
`/add` and their descendants hide it without clearing the pending update.
Only the card button dispatches `okbite:sw-apply`; stale actions after navigation
or disposal cannot apply it. An already waiting registration can restore the
notice after mounting. No client reload, worker message or async activation is
performed here. Native uses the matching inert hook.

Focused coverage uses real EventTarget events and Expo Router transitions through
the actual app shell. Only platform startup/fonts, diagnostics and queue work
are replaced in the shell test. RED: seven behavioral failures with the inert
hook/shell; GREEN: three suites, twelve tests. Logs: `/private/tmp/r4-update-red-behavior.log`
and `/private/tmp/r4-update-green.log`.

Local verification uses cached Node 22.23.4 and pnpm 11.25.0 with frozen locked
dependencies. Baseline and final full `pnpm check` passed (lint: zero errors,
57 existing warnings; mobile: 69 suites / 551 tests; data check: zero errors).
Final log: `/private/tmp/r4-update-check.log`. `expo export --platform all`
passed for web, iOS and Android; output: `/private/tmp/r4-update-bundles`,
log: `/private/tmp/r4-update-bundles.log`.

R1-W4 remains a dependency: registration must announce waiting workers and
handle the apply event with activation/reload protection for capture/add flows.
No public worker, registration or hosting files are changed by this task.
Hosted worker replacement, real iPhone and Android, home-screen/browser checks,
200% text, screen readers, Claude cross-review and human approval are NOT RUN
by this implementation. Unit tests and bundle exports do not complete those gates.
