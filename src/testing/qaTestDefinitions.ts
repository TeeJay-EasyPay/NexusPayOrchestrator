export type QATestSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type QATestCategory =
  | "CORRIDOR_EXECUTION"
  | "BACKGROUND_RESUME_STABILITY"
  | "TRANSFER_LIFECYCLE_VALIDATION";

export type QAPassFailCriteria = {
  pass: string;
  fail: string;
};

export type QATestDefinition = {
  id: string;
  category: QATestCategory;
  title: string;
  description: string;
  expectedOutcome: string;
  passFailCriteria: QAPassFailCriteria;
  severity: QATestSeverity;
  corridorCoverage: string[];
  regressionCoverage: string[];
  metadata: {
    amountGbp?: number;
    corridor?: string;
  };
};

const CORRIDORS = [
  "GBP->SAR",
  "GBP->KWD",
  "GBP->AED",
  "GBP->PHP",
  "GBP->MYR",
  "GBP->INR",
] as const;

const TEST_AMOUNTS_GBP = [1, 100, 500, 5000] as const;

function amountToken(amountGbp: number): string {
  if (amountGbp === 1) return "0001";
  if (amountGbp === 100) return "0100";
  if (amountGbp === 500) return "0500";
  return "5000";
}

function buildCorridorTestDefinitions(): QATestDefinition[] {
  return CORRIDORS.flatMap((corridor) => {
    return TEST_AMOUNTS_GBP.map((amountGbp) => {
      const id = `QA-CORRIDOR-${corridor.replace("->", "-")}-${amountToken(amountGbp)}`;

      return {
        id,
        category: "CORRIDOR_EXECUTION",
        title: `${corridor} transfer at GBP ${amountGbp}`,
        description:
          "Validate route generation, execution continuity, and UI state propagation across Send, History, and Track screens for the configured corridor and amount.",
        expectedOutcome:
          "Transfer completes without execution hang, appears in history, and is marked complete on Track screen with consistent status.",
        passFailCriteria: {
          pass:
            "Route is generated, execution starts, payout completes, history updates, and Track status reaches completed without timeout.",
          fail:
            "Any hang, timeout, inconsistent screen state, or incomplete status propagation after execution window.",
        },
        severity: corridor === "GBP->SAR" ? "CRITICAL" : "HIGH",
        corridorCoverage: [corridor],
        regressionCoverage: ["DEF-001", "DEF-002", "DEF-004"],
        metadata: {
          amountGbp,
          corridor,
        },
      };
    });
  });
}

const BACKGROUND_RESUME_STABILITY_TEST: QATestDefinition = {
  id: "QA-BG-RESUME-001",
  category: "BACKGROUND_RESUME_STABILITY",
  title: "Background and resume stability validation",
  description:
    "Launch app, background app for extended duration, resume app, execute a transfer, and verify post-resume state health and transfer integrity.",
  expectedOutcome:
    "App remains stable after resume, transfer executes normally, and state values remain synchronized across screens.",
  passFailCriteria: {
    pass:
      "App resumes without crash or freeze, transfer executes, and operational state remains consistent through completion.",
    fail:
      "App instability after resume, transfer failure attributable to stale state, or any forced restart requirement.",
  },
  severity: "CRITICAL",
  corridorCoverage: ["GBP->SAR", "GBP->KWD", "GBP->AED", "GBP->PHP", "GBP->MYR", "GBP->INR"],
  regressionCoverage: ["DEF-003", "DEF-004"],
  metadata: {},
};

const TRANSFER_LIFECYCLE_VALIDATION_TEST: QATestDefinition = {
  id: "QA-LIFECYCLE-001",
  category: "TRANSFER_LIFECYCLE_VALIDATION",
  title: "Transfer lifecycle completeness validation",
  description:
    "Validate lifecycle milestones: Funding Selected, Route Generated, Execution Started, Settlement Completed, Payout Completed, History Updated, and Track Screen Updated.",
  expectedOutcome:
    "All mandatory lifecycle milestones complete in sequence and the final transfer state is aligned between history and tracking surfaces.",
  passFailCriteria: {
    pass:
      "All seven milestones are present and no downstream screen misses the final completion state.",
    fail:
      "Any mandatory milestone missing, out-of-order critical milestone, or mismatch between history and track completion states.",
  },
  severity: "CRITICAL",
  corridorCoverage: ["GBP->SAR", "GBP->KWD", "GBP->AED", "GBP->PHP", "GBP->MYR", "GBP->INR"],
  regressionCoverage: ["DEF-001", "DEF-002", "DEF-004"],
  metadata: {},
};

export const QA_TEST_DEFINITIONS: QATestDefinition[] = [
  ...buildCorridorTestDefinitions(),
  BACKGROUND_RESUME_STABILITY_TEST,
  TRANSFER_LIFECYCLE_VALIDATION_TEST,
];

const QA_TEST_DEFINITION_MAP = new Map<string, QATestDefinition>(
  QA_TEST_DEFINITIONS.map((test) => [test.id, test])
);

export function getQATestDefinitionById(testId: string): QATestDefinition | null {
  return QA_TEST_DEFINITION_MAP.get(testId) ?? null;
}

export function getQATestDefinitions(): QATestDefinition[] {
  return [...QA_TEST_DEFINITIONS];
}

export function getCorridorTestDefinitions(corridor: string): QATestDefinition[] {
  return QA_TEST_DEFINITIONS.filter((test) => test.corridorCoverage.includes(corridor));
}

export function getRegressionTestDefinitions(defectId: string): QATestDefinition[] {
  return QA_TEST_DEFINITIONS.filter((test) => test.regressionCoverage.includes(defectId));
}
