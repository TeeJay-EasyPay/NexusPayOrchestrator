export const complianceAreas = [
  { id: "company", label: "Company verification · KYB", short: "Company", icon: "briefcase", description: "Company, ownership and business documents" },
  { id: "identity", label: "Identity verification · KYC", short: "Identity", icon: "user-check", description: "Identity documents and liveness" },
  { id: "aml", label: "AML screening", short: "Screening", icon: "shield", description: "Sanctions, PEP and watchlist results" },
  { id: "transactions", label: "Transaction monitoring", short: "Monitoring", icon: "activity", description: "Payment screening and review outcomes" },
] as const;
export type ComplianceArea = typeof complianceAreas[number]["id"];
export const complianceRoute = (area: ComplianceArea) => `/compliance?section=${area}`;
