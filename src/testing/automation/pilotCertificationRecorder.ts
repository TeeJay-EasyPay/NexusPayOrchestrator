import { DefectRecord, registerDefectObservation, upsertDefectRecord } from "../defectRegister";
import { QAExecutionLogEntry, QAExecutionResult, logQAExecution } from "../qaExecutionLogger";
import { getPilotScenarioByTestId } from "./pilotScenarios";

export type PilotCertificationStatus = "PASS" | "WARNING" | "FAIL";

export type PilotValidationResult = {
  routeGenerated: boolean;
  transferInitiated: boolean;
  executionProgressed: boolean;
  settlementCompleted: boolean;
  payoutCompleted: boolean;
  historyUpdated: boolean;
  trackCompleted: boolean;
  crossScreenConsistent: boolean;
};

export type PilotCertificationRunInput = {
  testId: string;
  status: PilotCertificationStatus;
  executionDurationMs: number;
  notes?: string;
  evidenceReference?: string;
  device?: string;
  validation: PilotValidationResult;
};

function toQAResult(status: PilotCertificationStatus): QAExecutionResult {
  return status === "FAIL" ? "FAIL" : "PASS";
}

function missingValidationKeys(validation: PilotValidationResult): string[] {
  return Object.entries(validation)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
}

function inferDefectId(input: PilotCertificationRunInput, missingKeys: string[]): string {
  if (input.status === "FAIL" && input.testId.includes("GBP-SAR")) {
    return "DEF-001";
  }

  if (missingKeys.includes("historyUpdated") || missingKeys.includes("trackCompleted")) {
    return "DEF-002";
  }

  return "DEF-004";
}

async function createAutomationDefectCandidate(input: PilotCertificationRunInput): Promise<DefectRecord> {
  const stamp = new Date().toISOString();
  const scenario = getPilotScenarioByTestId(input.testId);
  const suffix = stamp.replace(/[-:.TZ]/g, "").slice(0, 14);
  const defectId = `AUTO-${suffix}-${Math.floor(Math.random() * 900 + 100)}`;

  const defect: DefectRecord = {
    defectId,
    title: `Pilot certification failure for ${scenario?.corridor ?? input.testId}`,
    severity: input.status === "FAIL" ? "HIGH" : "MEDIUM",
    corridor: scenario?.corridor ?? "MULTI",
    description: [
      `Automated pilot certification created new defect candidate from ${input.testId}.`,
      `Status: ${input.status}`,
      input.notes ?? "No additional notes provided.",
      input.evidenceReference ? `Evidence: ${input.evidenceReference}` : "",
    ]
      .filter(Boolean)
      .join(" "),
    screenshots: [],
    reproductionSteps: [
      "Run Sprint 008 pilot certification runner.",
      `Inspect scenario ${input.testId} output and evidence pack.`,
      "Validate failure using Track and History consistency checks.",
    ],
    firstSeen: stamp,
    status: "OPEN",
  };

  await upsertDefectRecord(defect);
  return defect;
}

export async function recordPilotCertificationRun(
  input: PilotCertificationRunInput
): Promise<{ qaEntry: QAExecutionLogEntry; defectId?: string }> {
  const scenario = getPilotScenarioByTestId(input.testId);
  const missingKeys = missingValidationKeys(input.validation);

  const qaEntry = await logQAExecution({
    testId: input.testId,
    corridor: scenario?.corridor ?? "UNKNOWN",
    amount: scenario?.amount ?? 0,
    result: toQAResult(input.status),
    notes: [
      "PILOT_CERTIFICATION",
      `status=${input.status}`,
      missingKeys.length > 0 ? `missing=${missingKeys.join(",")}` : "missing=none",
      input.evidenceReference ? `evidence=${input.evidenceReference}` : "",
      input.notes ?? "",
    ]
      .filter(Boolean)
      .join(" | "),
    device: input.device,
    executionDurationMs: input.executionDurationMs,
  });

  if (input.status === "PASS") {
    return { qaEntry };
  }

  if (!scenario) {
    const createdDefect = await createAutomationDefectCandidate(input);
    return { qaEntry, defectId: createdDefect.defectId };
  }

  const defectId = inferDefectId(input, missingKeys);

  await registerDefectObservation({
    defectId,
    corridor: scenario.corridor,
    note: [
      `Automated Sprint 008 pilot result from ${input.testId}`,
      `status=${input.status}`,
      missingKeys.length > 0 ? `missing=${missingKeys.join(",")}` : "missing=none",
      input.evidenceReference ? `evidence=${input.evidenceReference}` : "",
    ]
      .filter(Boolean)
      .join(" | "),
  });

  return { qaEntry, defectId };
}
