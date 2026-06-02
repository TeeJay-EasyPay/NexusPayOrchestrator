# Founder Briefing: Device Provenance And Authentication Resolution

## What We Investigated
We investigated whether physical-device authentication behavior can be explained by the current repository code, build provenance, OTA updates, or stale device state.

## What We Found
The repository code is internally consistent: unauthenticated users should go to `/auth`, Demo Workspace access should appear on `/auth`, and Sign Out should return to `/auth`. What is not yet proven is whether the physical device is running this exact code, build, update channel, and update ID.

## What This Means For NexusPay
Startup V2 should remain a release gate until physical-device provenance is proven. WS1 does not need to block consumer app or architecture work.

## What Users Experience
If the device is stale, users may see the wrong login screen, miss Demo Workspace access, or appear signed out while Home still opens.

## Risk Level
High for release certification. Medium for ongoing product implementation.

## Recommended Action
Run a clean physical-device proof that records Git commit, EAS build ID, runtime version, update channel, update ID, startup logs, and screenshots.

## Decision Required From Founder
Approve the physical-device provenance run as the required Startup V2 release gate.

## Estimated Effort
Half day to one day, depending on physical device availability and EAS build/update access.

## Executive Confidence
Medium. Repository evidence is strong, but the physical-device root cause cannot be closed without device-side build and update evidence.
