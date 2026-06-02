# Device Provenance Investigation Report

## Date
2026-06-02

## Branch
`startup-v2-ws1-device-auth-resolution`

## Objective
Prove what code is running on physical devices and determine whether device behavior can be traced to a specific commit, build, runtime version, update channel, and update ID.

## Executive Finding
Device provenance is not conclusively proven from repository evidence alone.

The repository establishes the expected app identity, runtime version, update URL, build channels, and Startup V2 routing behavior. It does not contain physical-device package metadata, EAS build metadata, Expo Updates update ID, or device log evidence tying the installed physical app to the current `startup-v2` commit.

## Evidence Table
| Evidence area | Repository source | Finding | Status |
|---|---|---|---|
| Android package identity | `app.json` | Package is `com.nexuspay.orchestrator`. | Proven |
| App version | `app.json`, `package.json` | App version is `1.0.0`. | Proven |
| Runtime version | `app.json` | Expo runtime version is `1.0.0`. | Proven |
| Update URL | `app.json` | Expo Updates URL is `https://u.expo.dev/35f8cdd6-557f-493d-b065-52d6121f62d3`. | Proven |
| Update loading behavior | `app.json` | Updates are enabled and checked on app load with zero cache fallback timeout. | Proven |
| EAS channels | `eas.json` | Channels are `development`, `preview`, and `production`. | Proven |
| Installed physical APK commit | Repository files | No physical build artifact or device package dump was present. | Not proven |
| Installed physical update ID | Repository files | No Expo Updates device metadata was present. | Not proven |
| Embedded JS vs OTA JS | Repository files | Cannot be proven without device-side update metadata/logs. | Not proven |
| Cached stale update | Repository files | Plausible, but not provable without device-side update metadata/logs. | Not proven |

## Pass / Fail Criteria
### Pass
Device provenance is PASS only when all of the following are captured from the same physical install:
- Git commit used for build.
- EAS build ID and build profile.
- Runtime version.
- Update channel.
- Expo update ID or proof that embedded JS is being used.
- Android package dump for `com.nexuspay.orchestrator`.
- Startup V2 log evidence from cold launch.
- Screenshot after `startupComplete=true`.

### Fail
Device provenance is FAIL if any of these occur:
- Device cannot be tied to a Git commit.
- Runtime version or update channel cannot be identified.
- Expo update ID cannot be captured when OTA is enabled.
- Logs are missing current Startup V2 events.
- Screenshot disagrees with Startup V2 telemetry.

## Engineering Decisions
1. No product remediation was made in WS1.
2. WS1 remains a release gate only.
3. WS1 findings must not block WS2 or WS3 implementation unless device evidence proves a repository-wide runtime risk.

## Assumptions
- Physical-device behavior reported by the Founder remains materially different from current repository expectations.
- The current repository source is the intended `startup-v2` baseline.
- EAS/Expo update metadata must be collected from a real installed app to close provenance.

## Risks
| Risk | Level | Mitigation |
|---|---|---|
| Device is running stale OTA JS | High | Capture update ID and channel from device. |
| Device is running old APK | High | Capture package dump and build ID. |
| Runtime version `1.0.0` permits stale update reuse | Medium | Consider runtime version bump after provenance is proven. |
| Certification pressure bypasses evidence gate | High | Keep Startup V2 and pilot certification blocked until pass criteria are met. |

## Merge Readiness
Merge-ready as an investigation/reporting branch after review. This branch does not unblock release or pilot certification.
