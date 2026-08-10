-- Distinguish genuine sandbox-provider evidence from production LIVE evidence.

alter table public.partner_capabilities
  drop constraint if exists partner_capabilities_provenance_check;

alter table public.partner_capabilities
  add constraint partner_capabilities_provenance_check
  check (provenance in ('LIVE', 'SANDBOX', 'DERIVED', 'SIMULATED', 'FALLBACK', 'NO_DATA', 'DIAGNOSTIC', 'DISABLED'));

alter table public.partner_supported_corridors
  drop constraint if exists partner_supported_corridors_provenance_check;

alter table public.partner_supported_corridors
  add constraint partner_supported_corridors_provenance_check
  check (provenance in ('LIVE', 'SANDBOX', 'DERIVED', 'SIMULATED', 'FALLBACK', 'NO_DATA', 'DIAGNOSTIC', 'DISABLED'));
