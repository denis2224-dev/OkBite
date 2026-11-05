# Approved OkBite artwork inputs

These are the user's supplied magnifier/food artwork and tall Romanian startup page, copied byte-for-byte from the completed local `r4/app-icons` work at `e53412a3db55f96679cc5f8dc3df78051cfe4c7a`. They are release inputs, not screenshots or private product photographs. No application configuration was changed here.

- `app-icon.png`: 1024×1024, opaque. Approved square icon, usable for iOS/default icon and web favicon source.
- `android-foreground.png`: 1024×1024, alpha, the existing prepared adaptive foreground.
- `android-background.png`: 1024×1024, the matching existing adaptive background. Check actual Android masking before release; the old monochrome icon depicts different artwork and is intentionally excluded.
- `startup-screen.png`: 852×1846, opaque. User-supplied startup page: “okBite / Înțelege eticheta. Alege informat.” Preserve proportions and the warm background; do not crop the words.

## Concrete R1 configuration request

R1 owns `apps/mobile/app.config.ts`, icon/splash metadata and platform builds. Copy these approved inputs into the target app's assets as needed, point default/iOS icon, Android adaptive foreground/background, web favicon and PWA metadata to the matching artwork. Coordinate with D9 #46 rather than overwriting its manifest/service-worker work. Keep splash background consistent with the supplied warm page, including dark-mode startup behavior. Do not keep the old green icon as the installed app's identity.

R4 can wire the in-app startup overlay after the target asset paths are agreed. The earlier root preview uses a 1500ms minimum in `src/app.tsx`; the user's later request is to keep loading longer. Use a 2500ms minimum and wait for fonts/app readiness when longer, release safely on initialization errors, and clear timers on disposal. Do not delay network requests or claim a timer indicates server readiness. Native OS splash and web initial paint need matching presentation to avoid a flash before JavaScript starts.

This asset PR alone does not apply icons to installed applications. R1 must verify a fresh iOS/Android build and the browser/PWA icon after cache invalidation. Screenshots, store ownership/privacy confirmations and device acceptance remain outstanding.

## SHA-256 provenance

```text
4164b4c594a19b4bfc87cd798f4a3b35674dc94945997651599e9993f9308673  app-icon.png
12acd4458ece7987af58c17f10ae9904bd9e99e2c7e5ec03f1663f3a901c3c3f  android-foreground.png
0167dcb3be0b8d3f7df82e02cc01ab1178f88adc07c86ad184d0854d32499933  android-background.png
cd13cd972bd2d906133a94dcf0823ab6f6ae575da757b5500d2a3cf6b849cc48  startup-screen.png
```

Validation: source/destination byte comparison, PNG dimensions/alpha inspection, visual icon inspection. These assets add no runtime behavior or dependencies; behavioral validation belongs to their eventual target-app wiring.
