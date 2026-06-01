# Startup Architecture V2 Validation Evidence Package

## Date
2026-05-31

## Validation Summary
Application-level Startup V2 telemetry passed deterministic startup validation, but production certification is blocked because the Android native visual layer could not be certified.

## Primary Passing Evidence
20-cycle determinism run:
- JSON: `governance/automation/outputs/2026-05-31/startup-determinism-20260531001414/startup-determinism-results.json`
- Markdown: `governance/automation/outputs/2026-05-31/startup-determinism-20260531001414/startup-determinism-results.md`

Result:
- Cycle count: 20
- Deterministic: YES
- Expected flow: unauthenticated-login
- PASS cycles: 20
- FAIL cycles: 0
- Destination: `/auth`
- Auth state: `unauthenticated`
- Startup complete: `true` in every cycle
- Unexpected transitions: none

## Supporting Smoke Evidence
Passing smoke runs:
- `governance/automation/outputs/2026-05-31/startup-determinism-20260531001123/`
- `governance/automation/outputs/2026-05-31/startup-determinism-20260531002347/`
- `governance/automation/outputs/2026-05-31/startup-determinism-20260531002747/`

These runs confirmed the same route outcome: unauthenticated users deterministically reach `/auth`.

## Native Visual Validation Finding
After the 20-cycle pass, delayed screenshots still showed the native splash image instead of the auth screen:
- `governance/automation/outputs/latest/nexuspay-startup-v2-final-waited.png`
- `governance/automation/outputs/latest/nexuspay-startup-v2-hide-log.png`

Runtime logs from the one-cycle diagnostic run confirmed:
- JS started.
- Auth screen mounted.
- Startup V2 reached `startupComplete=true`.
- `startup-v2-splash-hide` was emitted.
- The delayed screenshot still showed the splash surface.

This means telemetry and React render state were healthy, but the Android native visual layer did not release the splash surface.

## Rebuild and Reinstall Evidence
Android debug build:
- Command: `npx expo run:android`
- Result: Gradle build successful.
- APK installed from `android/app/build/outputs/apk/debug/app-debug.apk`.

Clean reinstall:
- `adb uninstall com.nexuspay.orchestrator`: Success.
- `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`: Success.

Post-rebuild validation attempts:
- `governance/automation/outputs/2026-05-31/startup-determinism-20260531004654/`
- `governance/automation/outputs/2026-05-31/startup-determinism-20260531005028/`
- `governance/automation/outputs/2026-05-31/startup-determinism-20260531005430/`
- `governance/automation/outputs/2026-05-31/startup-determinism-20260531005607/`

Result:
- JS did not load.
- No `[Startup]` or `[StartupEvidence]` records were emitted.
- Android foreground activity became `expo.modules.devlauncher.launcher.errors.DevLauncherErrorActivity`.
- Screenshot evidence: `governance/automation/outputs/latest/nexuspay-dev-error-post-rebuild.png`.

## Validation Automation Improvements
The validator now:
- Starts the configured emulator when absent.
- Wakes and unlocks the emulator before launch.
- Applies stay-awake settings for validation.
- Configures ADB reverse for Metro.
- Polls logcat until `startupComplete=true` instead of using a fixed early sample.
- Disables UIAutomator fallback unless `STARTUP_USE_UIAUTOMATOR=true`.
- Requires `startupComplete=true` for PASS.

## Quality Gate Results
- Targeted ESLint: PASS.
- Android debug build: PASS.
- 20-cycle telemetry determinism: PASS.
- Visual/native Android certification: FAIL/BLOCKED.
- Full TypeScript: BLOCKED by pre-existing non-startup errors.

## Conclusion
Startup V2 application logic is implemented and deterministic under telemetry evidence. Certification cannot be granted until the Android native splash/dev-client blocker is resolved and visual validation confirms that users see the auth screen rather than the splash or dev-launcher error activity.

