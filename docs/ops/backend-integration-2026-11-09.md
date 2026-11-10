# Backend branch integration — 9 November 2026

Integrated C2-database-foundation, C3-lookup-followup, C4-scoring-followup,
C5-data-followup, D4-D5-ai-followup, C6-contributions-followup,
C7-moderation-followup and C8-operations-followup on current main at 2ab387a.
The user explicitly authorized merging and publishing without waiting for review.

Resolved AI conflicts by preserving main's fallback API key and manual label
entry with retained photos, while retaining pre-provider quota compensation,
bounded provider response reading and deadline fixes. Lifecycle regressions now
cover the combined behavior: unconfigured requests clean up; attempted label
reads that fail return editable null fields and keep reusable photos/quota.

Executed on the integrated code:

- Full `pnpm check`: passed; existing 57 lint warnings, no errors.
- Edge Function unit suite: 74 passed, no failures.
- Fresh disposable PostgreSQL 17 migration chain: 151 assertions passed.
- Shared-code regeneration: unchanged generated output.
- Operations Node suite: 8 passed; one environment-dependent recovery comparison
  test skipped. This does not replace the individual track's restore evidence.

No hosted database migrations, function deployments or auth changes were made.
Human food/source validation, real-photo grading and hosted/device acceptance
remain distinct release gates; publishing code does not complete those gates.
