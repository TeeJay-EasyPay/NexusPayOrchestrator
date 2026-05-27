import { PilotRunResult, ValidationChecks } from "./pilotScenarios";

export type DefectDiscoveryItem = {
  defectId: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  reason: string;
};

function missingChecks(validation: ValidationChecks): string[] {
  return Object.entries(validation)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
}

export function discoverDefectsForRun(run: {
  testId: string;
  corridor: string;
  status: "PASS" | "WARNING" | "FAIL";
  reason: string;
  validation: ValidationChecks;
}): DefectDiscoveryItem[] {
  if (run.status === "PASS") {
    return [];
  }

  const missing = missingChecks(run.validation);

  if (run.corridor === "GBP->SAR" && run.status === "FAIL") {
    return [
      {
        defectId: "DEF-001",
        severity: "CRITICAL",
        reason: `Saudi corridor pilot failed: ${run.reason}. Missing checks: ${missing.join(", ") || "none"}`,
      },
    ];
  }

  if (missing.includes("historyUpdated") || missing.includes("trackCompleted")) {
    return [
      {
        defectId: "DEF-002",
        severity: "HIGH",
        reason: `History/track mismatch detected: ${run.reason}. Missing checks: ${missing.join(", ")}`,
      },
    ];
  }

  if (run.status === "WARNING") {
    return [
      {
        defectId: "DEF-004",
        severity: "MEDIUM",
        reason: `Pilot warning indicates synchronization drift: ${run.reason}. Missing checks: ${missing.join(", ") || "none"}`,
      },
    ];
  }

  return [
    {
      defectId: "DEF-004",
      severity: "HIGH",
      reason: `Pilot certification failure detected: ${run.reason}. Missing checks: ${missing.join(", ") || "none"}`,
    },
  ];
}

export function summarizeDefects(results: PilotRunResult[]): {
  total: number;
  uniqueDefects: string[];
  bySeverity: Record<string, number>;
} {
  const all = results.flatMap((result) => result.defects);
  const bySeverity: Record<string, number> = {};

  for (const item of all) {
    bySeverity[item.severity] = (bySeverity[item.severity] ?? 0) + 1;
  }

  return {
    total: all.length,
    uniqueDefects: Array.from(new Set(all.map((item) => item.defectId))).sort(),
    bySeverity,
  };
}
