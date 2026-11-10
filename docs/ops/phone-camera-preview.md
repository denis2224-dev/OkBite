# Phone camera preview

Use the `fix/phone-camera-navigation` worktree. Requires Node, npm and OpenSSL
on the Mac's PATH. Connect the phone and Mac to the same trusted Wi-Fi.

```sh
EXPO_PUBLIC_PREVIEW=1 npx --yes pnpm@11.25.0 --filter mobile exec expo export -p web --output-dir /private/tmp/okbite-phone-https-web
node scripts/phone-preview.mjs
```

This is a local demonstration build, not a live AI/backend acceptance test.
The helper prints the HTTPS address and a certificate download address. It creates
a two-day local certificate authority under `/private/tmp/okbite-phone-preview-tls`
(private directory); no keys enter Git, no external tunnel is used, and it never
installs trust on any device. The servers serve only the export and public CA.

On iPhone, open the printed certificate address in Safari. Install that local
certificate from Settings > General > VPN & Device Management, then enable it in
Settings > General > About > Certificate Trust Settings. Compare its fingerprint
with the helper's output. [Apple's certificate trust instructions](https://support.apple.com/en-us/102390).
Open the printed HTTPS address and allow camera access. On Android, install the
same public certificate as a CA certificate in the device's security settings.
Remove the temporary certificate/profile after testing; Ctrl+C stops the servers.
Regenerate the temporary certificate directory after expiry or if it was deleted;
trust the replacement certificate manually. Never bypass a certificate warning.

Safari may lack live barcode decoding: manual entry and product photography remain
available. HTTPS enables camera access but does not add a missing barcode decoder.
Check denial/retry, gallery cancellation, camera readiness, Home/Capture/Back/Scan,
and large text on each real phone. Record actual outcomes; browser profiles and
Chromium's synthetic camera driver do not establish physical-device acceptance.

Regression command (also run against a separately started development Metro server
using `OKBITE_WEB_DEV_URL=http://127.0.0.1:8096` to check React's development warnings):
`pnpm e2e:web:build && pnpm e2e:web`. Run `pnpm check` and all-platform exports too.
