import type { CorporateRole, PersonaOption } from "../types/multiEntity";

export type CorporateRouteKey =
  | "dashboard"
  | "send_payments"
  | "batch_payments"
  | "batch_operations"
  | "recipients"
  | "notifications"
  | "corporate_governance"
  | "approval_governance"
  | "approval_rules"
  | "approval_queue"
  | "reports"
  | "payment_analytics"
  | "audit_logs"
  | "users_personas"
  | "settings"
  | "operations_command_centre"
  | "platform_health";

type Permission =
  | "configure_governance"
  | "manage_personas"
  | "create_batches"
  | "approve_payments"
  | "release_batches"
  | "view_audit"
  | "view_reports"
  | "view_operations";

const ROLE_PERMISSIONS: Record<CorporateRole, Permission[]> = {
  corporate_user: [
    "configure_governance",
    "manage_personas",
    "create_batches",
    "approve_payments",
    "release_batches",
    "view_audit",
    "view_reports",
    "view_operations",
  ],
  ceo: ["approve_payments", "view_audit", "view_reports"],
  cfo: ["approve_payments", "view_reports"],
  cto: ["view_audit", "view_reports", "view_operations"],
  finance_manager: ["create_batches", "approve_payments"],
  finance_director: ["approve_payments", "view_reports"],
  auditor: ["view_audit", "view_reports"],
};

const ROLE_ROUTES: Record<CorporateRole, CorporateRouteKey[]> = {
  corporate_user: [
    "dashboard",
    "send_payments",
    "batch_payments",
    "batch_operations",
    "recipients",
    "notifications",
    "corporate_governance",
    "approval_governance",
    "approval_rules",
    "approval_queue",
    "reports",
    "payment_analytics",
    "audit_logs",
    "users_personas",
    "operations_command_centre",
    "platform_health",
    "settings",
  ],
  ceo: ["dashboard", "approval_queue", "batch_operations", "reports", "audit_logs", "approval_rules", "notifications"],
  cfo: ["dashboard", "approval_queue", "batch_operations", "reports", "payment_analytics", "notifications"],
  cto: ["dashboard", "operations_command_centre", "platform_health", "reports", "notifications"],
  finance_manager: ["dashboard", "send_payments", "batch_payments", "approval_queue", "recipients", "notifications"],
  finance_director: ["dashboard", "approval_queue", "batch_operations", "reports", "notifications"],
  auditor: ["dashboard", "audit_logs", "reports", "approval_rules", "notifications"],
};

export function isCorporatePersona(persona: PersonaOption | null | undefined): boolean {
  return persona?.participantType === "CORPORATE" && Boolean(persona.corporateRole);
}

export function getCorporateRole(persona: PersonaOption | null | undefined): CorporateRole | null {
  return isCorporatePersona(persona) ? persona?.corporateRole ?? null : null;
}

export function hasCorporatePermission(persona: PersonaOption | null | undefined, permission: Permission): boolean {
  const role = getCorporateRole(persona);
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAccessCorporateRoute(persona: PersonaOption | null | undefined, route: CorporateRouteKey): boolean {
  const role = getCorporateRole(persona);
  if (!role) return false;
  return ROLE_ROUTES[role].includes(route);
}

export function getCorporateRouteKeys(persona: PersonaOption | null | undefined): CorporateRouteKey[] {
  const role = getCorporateRole(persona);
  return role ? ROLE_ROUTES[role] : [];
}

export function getRoleLabel(role: CorporateRole | string | null | undefined): string {
  switch (role) {
    case "corporate_user":
      return "Corporate User";
    case "ceo":
      return "CEO";
    case "cfo":
      return "CFO";
    case "cto":
      return "CTO";
    case "finance_manager":
      return "Finance Manager";
    case "finance_director":
      return "Finance Director";
    case "auditor":
      return "Auditor";
    default:
      return "Corporate Persona";
  }
}

export function getPersonasForRole(role: CorporateRole): string[] {
  switch (role) {
    case "corporate_user":
      return ["corporate-demo"];
    case "ceo":
      return ["corporate-ceo"];
    case "cfo":
      return ["corporate-cfo"];
    case "cto":
      return ["corporate-cto"];
    case "finance_manager":
      return ["finance-manager"];
    case "finance_director":
      return ["finance-director"];
    case "auditor":
      return ["corporate-auditor"];
    default:
      return [];
  }
}
