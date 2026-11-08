# Privacy release facts — awaiting team input

Prepared 8 November 2026 from the production task list; reused from 712db57 and reconciled for the apps/mobile PWA. This is
an evidence checklist, not a final policy or legal approval. Blank facts block
publication; no operator, address, retention period or consent is inferred.

## Facts the operator must provide

- [ ] Legal operator: full name, legal form, address and responsible person.
- [ ] Working support email and privacy-request email; person handling requests.
- [ ] Approved public HTTPS privacy, terms and support URLs, accessible without login.
- [ ] Purposes and applicable legal bases for each flow below; qualified legal review.
- [ ] Supabase production project, actual database/Storage region, agreement,
  subprocessors, access controls, cross-border transfers and backup retention.
- [ ] Actual AI intermediary/provider/model and account configuration. Team main
  uses TokenHarbor with a DeepSeek default; the hosted override is unconfirmed.
  Confirm photo/prompt retention, cache/logging, training, deletion, regions and
  agreement for the selected route. Do not assume paid means zero retention.
- [ ] Diagnostics enabled in the shipped binary: payload, purpose, UUID association,
  access, retention, redaction and deletion. Error text can include user input.
- [ ] Random device UUID: storage, recipients, purpose, server linkage and retention.
  A random UUID is not proof of anonymity. Shopping does not require an account.
- [ ] Contribution-photo policy: private uploads, public copies, permission to
  publish, moderation, access, retention and handling of accidental personal data.
- [ ] Backend owner's verified result for hidden-product photo removal, including
  private originals, public URLs, caches and backups. Until verified, hiding is
  not deletion and known public URLs may remain reachable.
- [ ] Request procedure for access, correction, contribution deletion and complaints,
  including identification without requiring shoppers to create accounts.
- [ ] Moderator-account/session data, retention, membership revocation and access.
- [ ] Minimum audience age and any restrictions resulting from the provider route.

## Data-flow review record

For **each** of these flows, supply: data fields; purpose/legal basis; recipient;
region/transfer; retention; deletion trigger/method; responsible person; evidence
path/date; approved wording. Status for every flow is **not yet approved**.

1. On-device SQLite/IndexedDB history, queued photos/codes and cleanup. Clearing
   history does not erase queued work, the UUID, server contributions or backups.
2. Product/front/ingredient/nutrition photos sent to lookup/AI services.
3. AI input/output, intermediary/upstream logs, shared caches and training uses.
4. Accepted contribution records and public product photos; reports and moderation.
5. UUID-bearing service calls, usage statistics, server/connection logs and errors.
6. Staff sign-in, session storage and membership records.

## Publication sequence

1. Collect the facts above against the accepted apps/mobile release. Root src/
   is a frozen design reference, not evidence of the production data flow.
2. After facts and legal review, put the approved Romanian policy/terms/about copy
   in `apps/mobile/src/copy/ro.ts` and render it through the existing routes.
3. Have the web owner host the approved policy at the confirmed HTTPS URL and
   verify it in Safari/Chrome without login. No hosting is performed here.
4. Match both store declarations to actual SDKs, requests, public photos and logs.
5. Record reviewer, approval date, build/SHA, policy revision and live URL before
   marking the legal task complete. Keep draft badges until this gate passes.

## Sources opened for preparation

[TokenHarbor privacy](https://tokenharbor.ai/privacy),
[Apple privacy declarations](https://developer.apple.com/app-store/app-privacy-details/),
[Google Play data safety](https://support.google.com/googleplay/android-developer/answer/10787469).
Opened 8 November 2026. These describe provider/store requirements, not the team's
actual hosted configuration or a legal determination.
