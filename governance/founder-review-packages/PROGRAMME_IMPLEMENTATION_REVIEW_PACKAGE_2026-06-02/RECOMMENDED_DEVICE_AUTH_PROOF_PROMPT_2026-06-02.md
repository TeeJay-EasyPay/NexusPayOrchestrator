# Recommended Device/Auth Proof Prompt

## Date
2026-06-02

Use this prompt for the next WS1 physical-device evidence run.

```md
Act as NexusPay Device Provenance and Startup V2 Certification Engineer.

Goal:
Prove exactly what code is running on the physical Android device and close the authentication/runtime parity question.

Required evidence:
1. Git branch and commit used for the build.
2. EAS build ID, build profile, runtimeVersion and channel.
3. Expo Updates source: embedded JS vs OTA JS vs cached update.
4. Expo update ID if OTA is active.
5. Android package dump for com.nexuspay.orchestrator.
6. Clean install or pm clear command output.
7. Logcat evidence for:
   - auth-bootstrap-start
   - supabase-user-validation-start
   - supabase-user-validation-success or failed
   - startup-v2-decision
   - startup-v2-route-replace
   - startup-v2-splash-hide
   - AUTH-MOUNT
   - AUTH-RENDER
8. Screenshot after startupComplete=true.
9. Sign Out evidence proving return to the same /auth implementation.

Pass criteria:
- Device is tied to a specific commit, build, runtimeVersion, channel and update ID/source.
- Clean unauthenticated launch reaches /auth.
- /auth shows Enter Demo Workspace.
- Sign Out returns to /auth.
- Screenshot and telemetry agree.

Do not implement product changes unless temporary instrumentation is explicitly required. Mark any instrumentation as temporary and remove it after evidence capture.
```
