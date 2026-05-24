# CTO Remediation Design - Sprint 005

## Purpose

Define a design-only remediation blueprint to restore deterministic execution continuity and terminal-state reliability before any implementation activity begins.

## Scope Boundary

This document is design and planning only.

No production implementation changes are authorized by this document.

## Problem Statement

Execution continuity for expanded corridors is not yet deterministic under interruption and resume conditions.

Current known risk state:
- Sentinel corridor GBP -> KWD is FAIL.
- Nine expanded corridors remain UNKNOWN pending runtime certification.

## Design Objectives

1. Guarantee single terminal-state resolution for every transfer execution lifecycle.
2. Ensure deterministic resume behavior after interruption events.
3. Prevent duplicate payout attempts and non-terminal persisted states.
4. Produce evidence-ready execution traces consumable by Testing Director and EQAO quality gates.

## Target Design Principles

- Deterministic state machine governance.
- Idempotent operation boundaries.
- Explicit retry semantics by failure class.
- Durable correlation IDs across all execution transitions.
- Observability-first trace design for auditability.

## Proposed Remediation Architecture (Design)

### 1. Terminal-State Contract Layer

Define a terminal-state contract with explicit mutually exclusive terminal outcomes:
- SUCCESS
- FAILED_FINAL
- CANCELLED_FINAL

Design rule:
A transfer must not remain in a non-terminal execution state after configured timeout and recovery policies complete.

### 2. Deterministic Resume Coordinator

Design a resume coordinator that evaluates persisted execution checkpoints and chooses exactly one next action path:
- Resume allowed and safe.
- Abort to FAILED_FINAL with reason code.
- Escalate to manual review queue with immutable audit marker.

### 3. Idempotency and Dedup Guardrails

Design idempotency keys per transfer and per payout attempt.

Guardrails must guarantee:
- At-most-once payout submission semantics.
- Duplicate callback/event suppression without dropping valid state transitions.

### 4. Evidence Trace Envelope

Define a standard trace envelope per transfer run:
- Correlation ID
- Corridor
- Lifecycle timestamps
- Checkpoint sequence
- Resume decision record
- Terminal-state decision record

This envelope is mandatory for certification evidence packs.

## Acceptance Criteria (Design Gate)

1. Deterministic state-transition diagram approved by CTO and EQAO.
2. Terminal-state contract complete with edge-case matrix.
3. Resume decision tree complete for interruption classes.
4. Idempotency and dedup policy documented with invariants.
5. Evidence trace schema finalized for certification consumption.

## Risk Register (Technical)

High:
- Hidden race conditions between callback ingestion and resume coordinator decisions.
- External provider response timing variance causing ambiguous intermediate states.

Medium:
- Overly broad retry logic may mask terminal failure semantics.
- Insufficient checkpoint granularity may reduce forensic reproducibility.

## Sprint 005 Design Deliverables

1. Deterministic execution state machine specification.
2. Terminal-state contract and exception taxonomy.
3. Resume coordinator decision matrix.
4. Idempotency and dedup control specification.
5. Evidence trace envelope schema.

## Handover to Testing Director

Testing must validate the design against sentinel-first certification, beginning with GBP -> KWD, before expanded corridor re-certification sequence proceeds.

## Handover to EQAO

EQAO quality gate review is required before implementation authorization.

## References

- [EXECUTION_CONTINUITY_EXECUTIVE_REVIEW.md](EXECUTION_CONTINUITY_EXECUTIVE_REVIEW.md)
- [CORRIDOR_CERTIFICATION_REPORT.md](CORRIDOR_CERTIFICATION_REPORT.md)
- [../sprint-archives/SPRINT_005_EXECUTION_CONTINUITY_REMEDIATION_AND_RECERTIFICATION.md](../sprint-archives/SPRINT_005_EXECUTION_CONTINUITY_REMEDIATION_AND_RECERTIFICATION.md)
- [../governance-core/DECISION_REGISTER.md](../governance-core/DECISION_REGISTER.md)
