# Emulator Execution Guide

## Purpose

Define the Sprint 008 executable baseline for Android emulator control and readiness verification during automated certification pilot runs.

## Scope

This guide applies to Sprint 008 pilot certification for sentinel corridors:

1. GBP->SAR
2. GBP->KWD

Pilot amounts:

1. GBP 100
2. GBP 500

## Prerequisites

1. Android SDK platform tools installed and available in PATH.
2. Android Emulator installed and available in PATH.
3. NexusPay Android build installed on emulator package id com.nexuspay.orchestrator.
4. Maestro CLI installed.

## Baseline Commands

1. Verify adb:

adb version

2. Verify emulator availability:

emulator -list-avds

3. Verify connected device:

adb devices

## Automated Baseline Layer

Sprint 008 baseline is implemented in:

- governance/automation/scripts/emulatorExecutionLayer.ts

The layer performs:

1. ADB availability check.
2. Active emulator detection.
3. Optional emulator startup using ANDROID_AVD_NAME.
4. Device readiness polling.
5. Application launch command for com.nexuspay.orchestrator.
6. Baseline artifact creation at emulator-baseline.json.

## One-Command Pilot Execution

Primary command:

npm run certification:pilot

PowerShell wrapper:

governance/automation/scripts/run-pilot-certification.ps1

The runner executes baseline checks before Maestro scenario flows.

## Readiness Gates

A pilot run is readiness-complete only if:

1. Emulator device is detected in adb devices.
2. App launch command executes successfully.
3. Maestro flow execution starts and artifacts are generated.

## Output Artifacts

Per pilot run:

1. governance/automation/outputs/<date>/pilot-<runId>/emulator-baseline.json
2. Scenario evidence packs.
3. Certification summary and report drafts.

## Failure Handling

If baseline fails:

1. Runner marks readiness issue in baseline notes.
2. Scenario runs continue in controlled mode for evidence generation.
3. Outcome is expected to include FAIL/WARNING with explicit reason.

## Governance Controls

1. Testing Director must approve evidence quality.
2. EQAO must approve certification quality.
3. Chief Orchestrator must approve pilot completion outcome.
4. Founder receives final briefing with evidence references.
