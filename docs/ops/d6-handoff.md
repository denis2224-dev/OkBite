# D6 native test preparation

This branch prepares code/offline flow definitions and a media loader; it does
not claim a native end-to-end run. Use a development client configured for
the team's staging project. Never point the unknown-product save test at
production. Keep service keys and private photographs out of the repository.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm test:media
corepack pnpm e2e
bash scripts/push-test-media.sh ios /private/path/to/test-media
bash scripts/push-test-media.sh android /private/path/to/test-media
```

The loader checks all five readable files before touching a device. Its test
uses text sentinels and a fake xcrun command to verify preflight and quoting;
those are not product photographs or simulator acceptance. The iOS loader
targets a booted simulator; Android requires one selected adb device.

The manual-code flow starts with camera permission denied, opens the existing
#14 scan route, enters the demo seed code 4840001000014 and expects its yogurt
and milk allergen. Validate the input selector on each native platform.
The seed is demonstrative; it is not a verified real-world food label.

Run that flow online first, disable the test device's network, then run
`pnpm e2e:offline`. Restore networking afterward. Do not use Maestro's
setAirplaneMode as iOS proof: its documentation states it has no effect on
iOS/web. The offline flow requires R4's history list, offline indicator and
accessible saved-product action; the current placeholder cannot pass it.

## Missing inputs and next steps

- #14 supplies scan/capture/add; #33 supplies the upload-budget correction.
- R4 must render durable history and the offline indicator; #45 supplies the
  pending-review queue ownership interface for R5, superseding the overlapping
  #38 approach only after owner/integration review.
- R5 supplies approved known/unknown photographs and expected transcriptions.
  The five names/provenance requirements are in .maestro/media/README.md.
  The photo/unknown-save flows are deferred until media and platform picker
  selectors exist; no fake gallery coordinates or invented labels are committed.
- Maestro, Android adb/emulator tools, signed development clients and staging
  configuration are unavailable here. xcrun is present, but no native device
  or build run was performed. Confirm permissions/200% fonts on real phones.
- R3's #36/#37 require live-provider grading before photo/add acceptance.

Frozen pnpm 11.25.0 install, lint (0 errors, 55 inherited warnings), types and
409 tests pass. Bash and Maestro YAML syntax checks pass. Codex review's
below-the-fold disclaimer finding was addressed by scrolling to the element;
its native behavior is still unverified because Maestro is unavailable.

Claude review, human approval, native flow execution, physical-device evidence
and the full D6 task remain open. CLI command references: Maestro addMedia and
setAirplaneMode under https://docs.maestro.dev/reference/commands-available/.
