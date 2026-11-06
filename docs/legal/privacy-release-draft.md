# Privacy and source review handoff — draft

Reviewed against repository source on 2026-11-05 at the B6b/C7d stack, not against
production traffic. No hosted Supabase project, operator identity, contact address,
human legal approval or human-opened nutrition sources are established here.
The Romanian in-app policy lives only in `apps/mobile/src/copy/ro.ts` (legal section),
rendered by `src/features/legal/texts.ts` and the `/privacy` Expo route.

## Observed implementation

- `src/lib/device.ts` uses SecureStore for a random UUID; `device.web.ts` uses
  localStorage. `api.ts` sends it as `x-device-id`. Random does not mean anonymous.
- `features/history/db.ts` stores up to 200 history records in SQLite; `.web.ts`
  uses IndexedDB. History deletion does not delete the queue, device ID or server
  records. Do not describe it as complete data deletion.
- `features/offline/photos.ts` copies queued JPEGs into the app's documents;
  `.web.ts` stores blobs in IndexedDB. The queue can retry after reconnection.
  Unresolved captures can remain queued; there is no universal retention deadline.
- `supabase/functions/_lib/storage.ts` uploads private images and copies accepted
  contribution images to the public products bucket. `add-product/service.ts`
  associates accepted contributions with the device ID. Public copies and private
  originals need separate retention/removal decisions. UI history deletion does
  not retract contributions. Technical connection logs require a hosting audit.
- C7 moderation uses Supabase Auth and moderator email accounts; shoppers do not
  need accounts. Preserve the real AdminGate, callback cleanup and About long-press
  entry. A hidden entry is not an authorization boundary.
- The integrated `identify` and `read-label` functions send stored, metadata-free
  JPEGs through TokenHarbor's API when configured. The default model is
  `deepseek-v4.1-flash:free`; `AI_MODEL` can override it. TokenHarbor is a separate
  intermediary. Live provider grading and processor/region/retention confirmation
  are still pending. Missing server credentials fail without sending a request.
- The six-category C4 score engine is integrated. The fixture file records 25
  human rechecks and six remaining unchecked entries; this integration does not
  establish complete human content or release approval.
- The mounted best-effort diagnostics reporter sends bounded error message/stack,
  route without query/fragment, application version/platform and device ID to the
  private, quota-limited `client-error` endpoint. Error text may itself contain
  user input; do not claim these diagnostics contain no personal information.

## Decisions required before release

The operator must provide its legal identity and working support/privacy contact;
confirm applicable law as of release; document purposes, lawful bases, recipients,
regions/transfers, retention, deletion, access/correction/complaint handling and
public contribution handling. No statement of compliance with a named law is made.
Do not copy the planning spec's old law citation into a final policy unchecked.

Inventory the actual shipped SDKs, permissions, logs, infrastructure, processors
and enabled AI services. Verify provider agreements and configuration. Determine
store data categories, collection/sharing meanings, purposes, identity linkage,
tracking and encryption from the final binary and real traffic, not from this
planning document. Validate queue cancellation/removal separately from history.
Confirm administrator account and session retention too.

R1/operator must establish a public HTTPS policy URL with no login, verify it in
an ordinary browser, and ensure it matches the app and store declarations. The
local `/privacy` route and export do not establish a public hosted policy.

## Sources and review limits

Useful preview wording was adapted from `origin/main:src/features/legal/texts.ts`;
its root application layout was not imported. Law applicability assertions and
unsupported provider/preservation claims were removed.

Open Food Facts confirms that its database is under ODbL in its official
[licensing documentation](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/).
This was checked by an agent, not signed off by a human. Dataset and image
licensing, attribution and share-alike obligations must be reviewed before each
import; an ODbL mention alone does not satisfy every reuse obligation. This work
claims no human source validation for product or nutrition data.

Final legal/content review, real iPhone/Android checks, 200% font and screen-reader
checks, connected staging verification, screenshots and store review are pending.

## Local verification

- Frozen install with cached pnpm 9.12.0 passed without manifest/lock changes.
- Test-first legal coverage: 7 failures before implementation, then 7 passing
  tests covering all four pages, disclosure content and the preserved About
  long-press route to `/admin`.
- Full `pnpm lint`: exit 0, with the 33 existing shared-contract no-redeclare
  warnings. Targeted legal/copy/routes lint: exit 0, no warnings.
- Full `pnpm typecheck`: exit 0 for shared and mobile.
- Full `pnpm test`: 278 passing (6 generator, 112 shared, 142 mobile,
  13 scripts, 5 gateway). This includes existing admin callback/gating tests.
- `pnpm --filter mobile exec expo export --platform all`: exit 0 for web,
  iOS and Android. Output is local at `/private/tmp/okbite-legal-export`.
- No browser visual check, physical-device validation, public deployment,
  store submission or legal approval is claimed by these automated checks.
