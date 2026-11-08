# Store privacy and age-rating preparation

Prepared 8 November 2026. These are candidate classifications and questions,
not submitted answers. The operator and release owner must approve them against
the actual binary, hosted configuration and processor agreements.

## Apple App Store privacy questionnaire

- Photos/other user content: review submitted product and label photos, extracted
  label text, corrections and reports. Confirm what is transmitted, stored and
  made public. Do not rely on an ephemeral-processing exception without evidence.
- Identifiers: review the random device UUID and association with contributions,
  quotas and diagnostics. Do not answer unlinked solely because it is random.
- Diagnostics: review error messages/stacks, route, version and platform. Confirm
  enabled collection and whether messages contain user input.
- Usage data: inspect actual events/statistics and UUID linkage, not just UI code.
- Contact info: inspect staff Auth email/session handling and any support flow.
- For each category confirm collection, purposes, linkage, tracking and third-party
  use. No advertising/tracking conclusion is approved from the task list alone.
- Supply a real public privacy-policy URL; record reviewer, date and build ID.

## Google Play data-safety questionnaire

- Review Photos and videos, Other user-generated content, Device or other IDs,
  App info/performance diagnostics, App activity and staff Personal info as
  applicable to the actual build.
- Determine collection versus sharing using Google's definitions and the actual
  Supabase/AI agreements. Sending data to a processor does not by itself settle
  the sharing answer. Review optional/required and ephemeral processing per flow.
- Confirm purposes, encryption in transit, retention and the deletion-request
  mechanism. Clearing local history does not delete public contributions.
- Confirm account-related questionnaire applicability separately for shoppers
  (no account) and moderators (Auth accounts). Do not invent an exemption.
- Record approved answers and restricted traffic/evidence path per data type.

## Age-rating and audience decisions

Do not select an age rating without completing each store's current questionnaire.
Review public contributions and moderation, external AI processing and its age
terms, external links, nutrition information and any health-related declarations.
Ask the operator for the intended audience and whether children are included.
No Kids category, child-targeted audience or minimum age is approved here.

TokenHarbor's current policy states its service is for people 18 and over. The
operator must clarify how those terms apply to the app's server-side API use;
that statement alone does not establish the app's store rating.

## Evidence required before marking complete

- [ ] Operator and privacy reviewer; actual model/route, regions and agreements.
- [ ] Build IDs/SHA and actual outbound-data/SDK inventory on iOS and Android.
- [ ] Retention/deletion implementation, public-photo hide result and support URL.
- [ ] Approved questionnaire answers and age-rating result from each console.

Sources opened 8 November 2026:
[Apple](https://developer.apple.com/app-store/app-privacy-details/),
[Google Play](https://support.google.com/googleplay/android-developer/answer/10787469),
[TokenHarbor](https://tokenharbor.ai/privacy).
