# Lighthouse, mobile — 10 Nov 2026

Lighthouse 12.8.2, mobile form factor, simulated slow 4G, headless Chromium, against
https://okbite-ir1.pages.dev/ (production, commit `3f6fa49`).

| Category | Score |
| --- | --- |
| Performance | 33 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 83 |

| Metric | Value |
| --- | --- |
| First Contentful Paint | 4.6 s |
| Largest Contentful Paint | 12.7 s |
| Total Blocking Time | 1,610 ms |
| Cumulative Layout Shift | 0.01 |
| Speed Index | 7.3 s |

## What drives the score

- **LCP is the startup artwork.** `assets/brand/startup-screen.png` is 1,256 KB of the page's 2,084 KB.
  Lighthouse estimates about 6 s of LCP saved by serving it as WebP/AVIF at display size.
  Owner: R4 (`StartupGate.tsx`, brand assets), [#126](https://github.com/denis2224-dev/OkBite/issues/126).
- **JavaScript:** 468 KB of scripts, 2.7 s of execution on a slow phone, 242 KB unused at first load.
- **SEO 83:** no meta description and no `robots.txt`. Both are fixed in this PR.

## Not covered here

- Install on Android Chrome and iOS Safari home screen, offline relaunch with history, a cold
  `/product/<id>` deep link and "known product under 3 s on throttled 4G" need real phones (U10 / [human]).
- Connected browser specs against a non-production backend need a staging web URL and anon key
  that CI can use; none exists yet.
