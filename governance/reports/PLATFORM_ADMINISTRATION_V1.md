# Platform Administration Framework V1

## Executive Summary

Platform Administration creates a fourth top-level NexusPay workspace for administering NexusPay itself. It is separate from Corporate Governance, Business Entities, and Private Users.

The Platform Administrator can view partner providers, corridor readiness, provider configuration metadata, platform health, environment status, system audit activity, implementation log status, and platform settings.

## Architecture

The implementation adds:

- A `PLATFORM_ADMINISTRATION` persona group.
- A `Platform Administrator` persona.
- A dedicated `PlatformShell` with isolated menu and sign out.
- Dedicated screens for platform operations.
- Supabase tables for partner ecosystem and provider readiness metadata.

## Database Design

Migration:

- `supabase/migrations/20260623000100_platform_administration_v1.sql`

Tables:

- `partner_providers`
- `partner_corridors`
- `partner_credentials_metadata`
- `partner_connection_status`
- `partner_notes`

Credential storage rule:

- No API secrets are stored in database fields.
- Database stores only metadata: configured state, environment, last updated time, and credential reference.
- Real secrets remain in Supabase Secrets, environment variables, or secure storage.

## UI Screens

- `app/platform-admin.tsx`
- `app/platform-partners.tsx`
- `app/platform-corridors.tsx`
- `app/platform-providers.tsx`
- `app/platform-health.tsx`
- `app/platform-environments.tsx`
- `app/platform-audit.tsx`
- `app/platform-implementation-log.tsx`
- `app/platform-settings.tsx`

## Services

- `src/services/platformAdministrationService.ts`
- `src/services/platformHealthService.ts`

## Provenance

- Partner provider and corridor data: `DERIVED` from Supabase metadata records.
- Provider credential metadata: `DERIVED`; secrets are not exposed.
- Platform health: uses existing health consistency model.
- Environment status: `SIMULATED` until CI/CD deployment telemetry is connected.
- Implementation log screen: `DERIVED` summary pointing to the durable governance log.

## Security Model

Platform Administration is isolated by persona group:

- Required persona group: `PLATFORM_ADMINISTRATION`
- Persona: `Platform Administrator`
- Corporate, business, and private personas are blocked from PlatformShell screens.

## Validation

- `npx tsc --noEmit` passed.
- Targeted ESLint passed.
- Supabase migration deployed successfully with `supabase db push`.

## Future Expansion

- Add write forms for provider status updates.
- Add secure provider onboarding workflow.
- Connect CI/CD deployment telemetry for environment status.
- Connect live partner API health checks.
- Add webhook status and incident history.
- Add role-based platform admin permissions if more platform personas are introduced.
