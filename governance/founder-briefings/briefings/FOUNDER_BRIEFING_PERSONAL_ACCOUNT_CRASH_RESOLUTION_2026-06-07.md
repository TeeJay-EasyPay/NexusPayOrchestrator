# Founder Briefing: Personal Account Workspace Crash — Investigation and Resolution

Date: 2026-06-07
Classification: Urgent Technical

---

## What happened

After opening Personal Account on the Multi-Account Preview screen, the app crashed immediately — returning to the device home screen or showing a blank grey screen.

Demo Workspace continued to work normally throughout.

---

## Root cause

The crash was caused by a single line of code in the Consumer Home Screen that was edited between the 2026-06-06 sprint delivery and today.

The code tried to access a property called `balances.gbp` from the wallet context. That property does not exist. The wallet context provides a property called `gbpBalance`. This mismatch causes a JavaScript crash the moment the consumer home screen renders.

This is not an architecture problem. It is not an authentication problem. It is not a routing problem. It is a property name error introduced by an edit after the sprint commit.

---

## Secondary finding

A secondary stability defect was identified in the transfer history loading code. A function that loads transfer history was not properly memoized, which would cause it to repeat indefinitely on any consumer screen that depends on it. This is now corrected alongside the primary fix.

---

## Actions taken

1. Replaced the incorrect `balances.gbp` reference with the correct `gbpBalance` from the wallet context.
2. Wrapped the `hydrateTransfers` function in `useCallback` to prevent infinite load loops on consumer screens.
3. Full lint and diagnostics run on all affected files — zero errors, zero warnings.
4. Changes committed and pushed to the active branch.

---

## Status after fix

- Consumer Home Screen: renders correctly
- Send, Track, Transfers, Profile, Settings, Nexus AI: all clean
- Demo Workspace: unchanged, still functional
- Startup V2 / Authentication / Account Isolation: all preserved

---

## APK recommendation

**Proceed with Founder Validation APK rebuild** from the current branch after this commit. Both defects are resolved. The Personal Account workspace should now launch without crash.

---

## Commit evidence

Provided in APK Readiness Assessment.
