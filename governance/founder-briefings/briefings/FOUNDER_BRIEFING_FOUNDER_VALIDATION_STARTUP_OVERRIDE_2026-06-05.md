# Founder Briefing - Founder Validation Startup Override - 2026-06-05

## What We Investigated

We investigated why the Founder Validation APK path was being intercepted by normal Startup V2 session restoration, then implemented a branch-only validation override.

## What We Found

Startup V2 was behaving like a normal banking app: if a saved session existed, it bypassed the public Multi-Account Preview and opened the protected experience after unlock.

The Founder Validation branch now overrides startup so launch goes directly to:

```text
NexusPay Multi-Account Preview
```

## What This Means For NexusPay

This creates a clean validation path to prove the multi-account entry screen and consumer app can be reached on a physical device without normal session restoration getting in the way.

## What Users Experience

For this validation branch, launch should show:

```text
NexusPay Multi-Account Preview
  -> Demo Workspace / Corporate Experience
  -> Personal Account / Consumer Experience
```

## Risk Level

Medium.

The implementation is intentionally not production startup behaviour, and physical-device visual proof is still pending because no device was attached in this session.

## Recommended Action

Use the Founder Validation branch for APK generation and test the first screen plus both workspace paths on a physical device.

## Decision Required From Founder

Approve using this validation-only branch for APK testing, with the understanding that this override must not be merged into production startup behaviour without a separate product decision.

## Estimated Effort

Small.

The implementation is complete; the remaining work is APK generation and physical-device validation.

## Executive Confidence

Medium-high.

Code and static validation are strong; confidence becomes high once a physical device confirms the first visible screen.

## Reference Documents

- `governance/executive-reports/FOUNDER_VALIDATION_STARTUP_OVERRIDE_IMPLEMENTATION_REPORT_2026-06-05.md`
- `governance/executive-reports/FOUNDER_VALIDATION_STARTUP_OVERRIDE_VALIDATION_REPORT_2026-06-05.md`
- `governance/executive-reports/HAS_ACCESS_ROOT_CAUSE_ANALYSIS_2026-06-05.md`
- `governance/executive-reports/STARTUP_EXECUTION_TRACE_REPORT_2026-06-05.md`
