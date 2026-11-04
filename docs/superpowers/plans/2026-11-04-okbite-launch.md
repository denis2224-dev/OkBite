# OkBite Launch Plan (whole team, after the app is finished)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Read `AGENTS.md` and `docs/superpowers/plans/2026-11-04-okbite-overall.md` first. Steps marked **(human)** are done by a person.

**Goal:** Publish the finished app in the App Store, Google Play and at okbite.md. This starts only when the "App complete" checkpoint in the overall plan is ticked; until then everyone codes.

**Who does what:** R1 runs the builds and store submission (D8, it knows EAS); R4 writes the listing texts and takes the screenshots (A5, it owns the copy); R5 runs the launch posts (A8, it ran the beta). Everyone answers store-review questions on their own area.

**Order:** A5 → D8 → A8. Store accounts: the Apple developer account comes from the professor (request App Store Connect access by 1 Dec); register Google Play at the start of this phase.

**Spec:** `docs/superpowers/specs/2026-11-03-okbite-design.md`

## Global Constraints

See the overall plan. Store texts make no health claims. Pricing is undecided: list the app as free.

## Review Focus (owned here)

- A JS-only hotfix must reach installed apps through `eas update` without a new store review (D8 release.md).
- Store review notes must let a reviewer test without an account (A5).

---

### Task A5: Store listing material

**Files:**
- Create: `store/listing.ro.md`, `store/privacy-answers.md`, `store/icon/icon.svg`, `store/screenshots/` (iPhone 6.7" and Android phone), `store/review-notes.md`

- [ ] **Step 1:** `listing.ro.md` — app name "OkBite", subtitle (≤ 30 characters), short description (≤ 80, Google Play), full description (≤ 4000), keywords (≤ 100, App Store), category Food & Drink, support email, privacy policy URL from A4. No health claims, no comparison with named competitors.
- [ ] **Step 2:** `privacy-answers.md` — answers for Apple's App Privacy labels and Google Play's Data safety form: photos (collected, not linked to identity, used for app functionality), device id (app functionality, not tracking), no location, no contacts, data encrypted in transit, deletion contact.
- [ ] **Step 3:** Icon (1024×1024 source) and splash with the brand green; add them to `app.config.ts` in D8.
- [ ] **Step 4 (human):** Six screenshots per platform from the beta build: home, photo, result, ingredients, add flow, compare; Romanian captions on each.
- [ ] **Step 5:** `review-notes.md` — notes for Apple review: what the app does, that no login is needed, test barcodes `4840001000014` and `4840001000021`, and that the admin area is staff-only.
- [ ] **Step 6: Commit** — `docs(store): listing texts, privacy answers, icon and screenshots`

---

### Task D8: Store builds, beta tracks, submission and release

**Files:**
- Create: `docs/ops/release.md`
- Modify: `apps/mobile/app.config.ts` (final icon, splash, version), `apps/mobile/eas.json` (submit profiles)

- [ ] **Step 1: Production builds (2 Dec)** — `eas build --profile production --platform all`; install on two real phones and run the Maestro flows against production.
- [ ] **Step 2: Store records** — App Store Connect and Play Console apps for `md.okbite.app`; fill in A5's texts, screenshots, privacy labels / data-safety answers, age rating, support email and privacy policy URL; price set to free (pricing undecided — see overall plan).
- [ ] **Step 3: Submit for review (2–3 Dec)** — `eas submit` to both stores with release mode "manual", so both go live together on 8 Dec. If Apple rejects, fix and resubmit the same day; if approval is late, launch the web app at okbite.md on 8 Dec and the store apps when approved.
- [ ] **Step 4: `release.md`** — pre-flight checklist (checkpoints ticked, migrations on prod with `supabase db push`, function secrets set, data loaded, Maestro green on prod build), hotfix path (`eas update --channel production` for JS-only fixes), rollback (republish the previous update; for native issues, halt the Play rollout and remove the iOS build from sale).
- [ ] **Step 5: Launch 8 Dec** — release both approved builds, tag `v1.0.0`, watch `daily_stats` and `client_errors` for the first 48 h.
- [ ] **Step 6: Commit** — `docs(ops): release checklist, hotfix and rollback`

---

### Task A8: Launch posts (8 Dec)

- [ ] **Step 1:** 30-second screen recording: photo of a product → result → ingredients; and photo of an unknown product → added.
- [ ] **Step 2:** Romanian posts for student groups and local Facebook / Telegram groups with the App Store and Google Play links and `okbite.md` for use in the browser; no health claims.
- [ ] **Step 3:** Publish once both stores show the app (D8 step 5).
