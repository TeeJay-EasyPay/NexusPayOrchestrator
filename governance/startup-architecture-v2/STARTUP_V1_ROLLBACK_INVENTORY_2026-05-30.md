# Startup V1 Rollback Inventory

## Programme

Startup Architecture V2 Programme

## Date

2026-05-30

## Phase 1 Status

Rollback protection is established before Startup V2 implementation.

## Baseline Package

Startup V1 baseline files have been copied to:

`governance/startup-architecture-v2/rollback/startup-v1-baseline-2026-05-30`

The package includes a SHA-256 manifest:

`governance/startup-architecture-v2/rollback/startup-v1-baseline-2026-05-30/startup-v1-baseline-manifest.json`

## Startup Files Included

| Area | Files |
|---|---|
| Root app shell | `app/_layout.tsx`, `app.json`, `package.json` |
| Public startup routes | `app/auth.tsx`, `app/check-email.tsx`, `app/account-created.tsx` |
| Startup destinations and auth-adjacent routes | `app/index.tsx`, `app/account.tsx` |
| Startup routing and chrome | `src/components/auth/AuthGate.tsx`, `src/components/ui/Screen.tsx`, `src/components/navigation/AppDropdownMenu.tsx`, `src/components/navigation/AppMenu.tsx` |
| Auth and unlock state | `src/state/AuthContext.tsx`, `src/state/DeviceUnlockContext.tsx`, `src/components/auth/UnlockPanel.tsx`, `src/components/auth/UserAccountBadge.tsx` |
| Provider startup dependencies | `src/state/WalletContext.tsx`, `src/state/TransferContext.tsx`, `src/state/PaymentMethodsContext.tsx`, `src/lib/supabase.ts` |
| Startup telemetry | `src/services/startupEvidence.ts`, `src/services/startupLogger.ts` |
| Startup-adjacent settings telemetry | `src/hooks/useNexusAISettings.ts`, `src/services/nexusAISettingsService.ts` |
| Startup validation automation | `governance/automation/scripts/runStartupDeterminismValidation.ts`, `governance/automation/scripts/emulatorExecutionLayer.ts`, `governance/automation/scripts/metroOrchestrator.ts`, `governance/automation/scripts/commandUtils.ts` |
| Native Android splash and launch | `android/app/src/main/res/values/colors.xml`, `android/app/src/main/res/values-night/colors.xml`, `android/app/src/main/res/values/styles.xml`, `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/java/com/nexuspay/orchestrator/MainActivity.kt` |
| Splash assets | `assets/images/splash-icon.png`, `android/app/src/main/res/drawable-mdpi/splashscreen_logo.png`, `android/app/src/main/res/drawable-hdpi/splashscreen_logo.png`, `android/app/src/main/res/drawable-xhdpi/splashscreen_logo.png`, `android/app/src/main/res/drawable-xxhdpi/splashscreen_logo.png`, `android/app/src/main/res/drawable-xxxhdpi/splashscreen_logo.png` |

## Restoration Procedure

Use this procedure only if Startup V2 must be rolled back.

1. Stop Metro, emulator test loops, and any running validation process.
2. Confirm the rollback target is the repository root: `C:\Users\t_jeh\NexusPayOrchestrator`.
3. Copy the baseline package contents back to the same relative paths in the repository root.
4. Run `git diff --check`.
5. Run the startup validation command available at rollback time.
6. Record the rollback action in the decision register and founder briefing trail.

PowerShell restoration command from the repository root:

```powershell
$baseline = "governance\startup-architecture-v2\rollback\startup-v1-baseline-2026-05-30"
Get-ChildItem -LiteralPath $baseline -Recurse -File |
  Where-Object { $_.Name -ne "startup-v1-baseline-manifest.json" } |
  ForEach-Object {
    $relative = $_.FullName.Substring((Resolve-Path $baseline).Path.Length + 1)
    $target = Join-Path (Get-Location) $relative
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
    Copy-Item -LiteralPath $_.FullName -Destination $target -Force
  }
```

## Rollback Validation

After restoration, validate that the baseline package was copied back cleanly:

```powershell
git diff --check
git status --short
```

If the restoration is intended to become the active implementation, review the changed file list before committing.

## Founder-Facing Rollback Summary

Startup V1 has been preserved before any Startup V2 code changes. If Startup V2 produces an unacceptable regression, the project can restore the previous startup files from the baseline package and re-run startup validation without reconstructing the old implementation manually.

## Phase 1 Decision

Phase 1 rollback protection is complete. Startup V2 architecture review may proceed.

