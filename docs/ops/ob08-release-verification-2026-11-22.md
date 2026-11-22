# OB-08 release verification

22 November 2026. The review branch combines the improvement tickets with GitHub `main` at `050be4d60be8ae232d759b42a3c6e7a2a4cbf031`. Compared with the locally tested runtime snapshot `4b3ad2b792a806c07f6b1f8689e448b13932833b`, it keeps the shelf index migration that landed in #236. App and function sources match the tested snapshot.

| Check | Result on the local candidate |
| --- | --- |
| Mobile Jest | 175 suites and 1,551 tests passed. Two browser decoder suites could not load because the cached installation lacks ZXing. |
| Shared packages | 583 tests passed and TypeScript passed. |
| Root, DOM and scripts | 114 root tests, 9 DOM tests and 111 script tests passed. One script test was skipped. Root and Playwright TypeScript checks and data validation passed. |
| Backend unit and tooling | 36 lookup and shelf tests passed using the Node compatibility harness. 29 tooling checks passed, including the generated contract and gateway configuration checks. |
| Expo export | iOS and Android exports passed with clean Metro caches. Bundle source maps matched the candidate sources. Web export stopped at the missing `@zxing/browser` module. |
| Full workspace check | The frozen install could not reach npm and the offline metadata cache was incomplete. With the installed dependencies, repository lint and mobile TypeScript also stopped at missing ZXing imports. |
| Playwright | 140 tests were discovered across both device profiles. Execution requires the web export and a loopback listener. |

## Remaining release evidence

| Owner | Evidence required | Status |
| --- | --- | --- |
| R1 + R5 | Approved iPhone and Android builds, Safari and Chrome on those phones, and both installed PWAs. Record build ID, OS/browser, language, scenario, outcome and linked fix or evidence. Use the [phone checklist](n16-redesign-phone-checks.md) and [beta scenarios](r5/beta/scenarios.md). | Pending physical devices and an approved candidate build. Maestro flows are ready for the builds. |
| R2 + R3 | Run local pgTAP and the gateway integration checks. On staging, record the deployment SHA and CORS/response smoke results for populated and empty shelves. Time the largest representative category and compare its ranking with Result. | Pending Docker, an approved staging deployment and representative catalogue data. |
| Product owner + R1 | Verify the shelf entry point on the approved candidate and exercise retry and empty states in a browser. | The separate entry point is under review in [#265](https://github.com/denis2224-dev/OkBite/pull/265). |
| R3 | Run the [label accuracy harness](label-accuracy-how-to.md) against approved staging with real package photos and independently transcribed truth. Record model/config, attempted, skipped and answered denominators, exact nutrient and within-0.1 results, unit and ingredient matches, and missing values that became numbers. For each package, explicitly compare declared allergens, possible traces and absent values with the result. | Zero real photo sets run. Images, transcriptions, model and approved staging target are pending. |
| Coordinator | Obtain Claude cross-review and human approval, and record GitHub CI on the proposed changes before release sign-off. | Draft reviews and CI sign-off pending. |

Follow the existing [backend release checklist](c8-release-checklist-2026-11-09.md) and beta gates once the linked evidence is available.
