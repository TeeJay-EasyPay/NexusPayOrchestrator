import path from "node:path";

export type PilotOutcome = "PASS" | "WARNING" | "FAIL";

export type ValidationChecks = {
  routeGenerated: boolean;
  transferInitiated: boolean;
  executionProgressed: boolean;
  settlementCompleted: boolean;
  payoutCompleted: boolean;
  historyUpdated: boolean;
  trackCompleted: boolean;
  crossScreenConsistent: boolean;
};

export type PilotScenario = {
  scenarioId: string;
  corridor: "GBP->SAR" | "GBP->KWD";
  amount: 100 | 500;
  testId: string;
  maestroFlowPath: string;
};

export type PilotRunResult = {
  scenario: PilotScenario;
  runId: string;
  status: PilotOutcome;
  reason: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  validation: ValidationChecks;
  artifacts: {
    runDirectory: string;
    junitPath: string;
    screenshotsDirectory: string;
    logsDirectory: string;
    evidencePackPath: string;
  };
  defects: {
    defectId: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    reason: string;
  }[];
};

export type PilotAggregateSummary = {
  generatedAt: string;
  runId: string;
  total: number;
  pass: number;
  warning: number;
  fail: number;
  passRate: number;
  failRate: number;
  results: PilotRunResult[];
  evidenceReferences: string[];
};

export function getPilotScenarios(repoRoot: string): PilotScenario[] {
  const base = path.join(
    repoRoot,
    "governance",
    "automation",
    "maestro",
    "flows",
    "corridor"
  );

  return [
    {
      scenarioId: "pilot-gbp-sar-100",
      corridor: "GBP->SAR",
      amount: 100,
      testId: "QA-CORRIDOR-GBP-SAR-0100",
      maestroFlowPath: path.join(base, "gbp-sar", "amount-100.yaml"),
    },
    {
      scenarioId: "pilot-gbp-sar-500",
      corridor: "GBP->SAR",
      amount: 500,
      testId: "QA-CORRIDOR-GBP-SAR-0500",
      maestroFlowPath: path.join(base, "gbp-sar", "amount-500.yaml"),
    },
    {
      scenarioId: "pilot-gbp-kwd-100",
      corridor: "GBP->KWD",
      amount: 100,
      testId: "QA-CORRIDOR-GBP-KWD-0100",
      maestroFlowPath: path.join(base, "gbp-kwd", "amount-100.yaml"),
    },
    {
      scenarioId: "pilot-gbp-kwd-500",
      corridor: "GBP->KWD",
      amount: 500,
      testId: "QA-CORRIDOR-GBP-KWD-0500",
      maestroFlowPath: path.join(base, "gbp-kwd", "amount-500.yaml"),
    },
  ];
}
