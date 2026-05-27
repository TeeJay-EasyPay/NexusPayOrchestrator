import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { isPilotCertificationTestId } from "./automation/pilotScenarios";
import {
    getOpenDefectCount,
    registerDefectObservation,
} from "./defectRegister";
import {
    getQATestDefinitionById,
    QA_TEST_DEFINITIONS,
} from "./qaTestDefinitions";

export type QAExecutionResult = "PASS" | "FAIL";

export type QAExecutionLogEntry = {
  testId: string;
  timestamp: string;
  corridor: string;
  amount: number;
  result: QAExecutionResult;
  notes: string;
  device: string;
  executionDurationMs: number;
};

export type QAExecutionInput = {
  testId: string;
  corridor: string;
  amount: number;
  result: QAExecutionResult;
  notes?: string;
  device?: string;
  executionDurationMs: number;
  timestamp?: string;
};

export type QATestCentreSummary = {
  totalExecuted: number;
  passed: number;
  failed: number;
  openDefects: number;
  lastTestResult: QAExecutionLogEntry | null;
  pilotRuns: number;
  pilotPassed: number;
  pilotFailed: number;
  lastPilotResult: QAExecutionLogEntry | null;
};

export type BackgroundResumeValidationInput = {
  corridor: string;
  amount: number;
  backgroundDurationSeconds: number;
  resumedSuccessfully: boolean;
  transferExecuted: boolean;
  stateVerified: boolean;
  executionDurationMs: number;
  device?: string;
  notes?: string;
};

export type TransferLifecycleValidationInput = {
  corridor: string;
  amount: number;
  fundingSelected: boolean;
  routeGenerated: boolean;
  executionStarted: boolean;
  settlementCompleted: boolean;
  payoutCompleted: boolean;
  historyUpdated: boolean;
  trackScreenUpdated: boolean;
  executionDurationMs: number;
  device?: string;
  notes?: string;
};

export type TransferLifecycleValidationResult = {
  passed: boolean;
  missingMilestones: string[];
};

const QA_EXECUTION_LOG_STORAGE_KEY = "nexuspay.qa.executionLogs.v1";
const QA_EXECUTION_LOG_LIMIT = 600;
const TRANSFER_LIFECYCLE_TEST_ID = "QA-LIFECYCLE-001";
const BACKGROUND_RESUME_TEST_ID = "QA-BG-RESUME-001";

function parseExecutionLogs(rawValue: string | null): QAExecutionLogEntry[] {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is QAExecutionLogEntry => {
      return (
        typeof item === "object" &&
        item !== null &&
        typeof (item as QAExecutionLogEntry).testId === "string" &&
        typeof (item as QAExecutionLogEntry).timestamp === "string" &&
        typeof (item as QAExecutionLogEntry).corridor === "string" &&
        typeof (item as QAExecutionLogEntry).amount === "number" &&
        ((item as QAExecutionLogEntry).result === "PASS" ||
          (item as QAExecutionLogEntry).result === "FAIL") &&
        typeof (item as QAExecutionLogEntry).notes === "string" &&
        typeof (item as QAExecutionLogEntry).device === "string" &&
        typeof (item as QAExecutionLogEntry).executionDurationMs === "number"
      );
    });
  } catch {
    return [];
  }
}

function resolveDeviceLabel(device?: string): string {
  if (device && device.trim().length > 0) {
    return device;
  }

  const version = typeof Platform.Version === "string" ? Platform.Version : String(Platform.Version);
  return `${Platform.OS}-${version}`;
}

function trimLogHistory(entries: QAExecutionLogEntry[]): QAExecutionLogEntry[] {
  return entries.slice(0, QA_EXECUTION_LOG_LIMIT);
}

async function saveLocalExecutionLogs(entries: QAExecutionLogEntry[]): Promise<void> {
  await AsyncStorage.setItem(QA_EXECUTION_LOG_STORAGE_KEY, JSON.stringify(entries));
}

async function syncExecutionToSupabase(entry: QAExecutionLogEntry): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const { error } = await supabase.from("qa_execution_logs").insert({
      user_id: user.id,
      test_id: entry.testId,
      timestamp: entry.timestamp,
      corridor: entry.corridor,
      amount: entry.amount,
      result: entry.result,
      notes: entry.notes,
      device: entry.device,
      execution_duration_ms: entry.executionDurationMs,
    });

    if (error) {
      console.warn("QA execution Supabase sync failed", error.message);
    }
  } catch (error) {
    console.warn("QA execution Supabase sync failed", error);
  }
}

export async function loadQAExecutionLogs(): Promise<QAExecutionLogEntry[]> {
  const raw = await AsyncStorage.getItem(QA_EXECUTION_LOG_STORAGE_KEY);
  return parseExecutionLogs(raw);
}

export async function logQAExecution(input: QAExecutionInput): Promise<QAExecutionLogEntry> {
  const testDefinition = getQATestDefinitionById(input.testId);
  const fallbackDefinition = QA_TEST_DEFINITIONS.find((test) => test.id === input.testId);

  const entry: QAExecutionLogEntry = {
    testId: input.testId,
    timestamp: input.timestamp ?? new Date().toISOString(),
    corridor: input.corridor,
    amount: input.amount,
    result: input.result,
    notes:
      input.notes?.trim() ||
      `Execution recorded for ${testDefinition?.title ?? fallbackDefinition?.title ?? input.testId}`,
    device: resolveDeviceLabel(input.device),
    executionDurationMs: Math.max(0, Math.floor(input.executionDurationMs)),
  };

  const current = await loadQAExecutionLogs();
  const next = trimLogHistory([entry, ...current]);

  await saveLocalExecutionLogs(next);
  await syncExecutionToSupabase(entry);

  return entry;
}

export async function getQATestCentreSummary(): Promise<QATestCentreSummary> {
  const logs = await loadQAExecutionLogs();
  const passed = logs.filter((log) => log.result === "PASS").length;
  const failed = logs.filter((log) => log.result === "FAIL").length;
  const pilotLogs = logs.filter((log) => isPilotCertificationTestId(log.testId));
  const pilotPassed = pilotLogs.filter((log) => log.result === "PASS").length;
  const pilotFailed = pilotLogs.filter((log) => log.result === "FAIL").length;
  const openDefects = await getOpenDefectCount();

  return {
    totalExecuted: logs.length,
    passed,
    failed,
    openDefects,
    lastTestResult: logs[0] ?? null,
    pilotRuns: pilotLogs.length,
    pilotPassed,
    pilotFailed,
    lastPilotResult: pilotLogs[0] ?? null,
  };
}

export function validateTransferLifecycle(
  input: TransferLifecycleValidationInput
): TransferLifecycleValidationResult {
  const milestones: [string, boolean][] = [
    ["Funding Selected", input.fundingSelected],
    ["Route Generated", input.routeGenerated],
    ["Execution Started", input.executionStarted],
    ["Settlement Completed", input.settlementCompleted],
    ["Payout Completed", input.payoutCompleted],
    ["History Updated", input.historyUpdated],
    ["Track Screen Updated", input.trackScreenUpdated],
  ];

  const missingMilestones = milestones
    .filter(([, completed]) => !completed)
    .map(([label]) => label);

  return {
    passed: missingMilestones.length === 0,
    missingMilestones,
  };
}

export async function executeBackgroundResumeStabilityTest(
  input: BackgroundResumeValidationInput
): Promise<QAExecutionLogEntry> {
  const passed = input.resumedSuccessfully && input.transferExecuted && input.stateVerified;

  const notes = [
    `Background duration: ${input.backgroundDurationSeconds}s`,
    `Resumed: ${input.resumedSuccessfully ? "yes" : "no"}`,
    `Transfer executed: ${input.transferExecuted ? "yes" : "no"}`,
    `State verified: ${input.stateVerified ? "yes" : "no"}`,
    input.notes?.trim() || "",
  ]
    .filter((line) => line.length > 0)
    .join(" | ");

  const entry = await logQAExecution({
    testId: BACKGROUND_RESUME_TEST_ID,
    corridor: input.corridor,
    amount: input.amount,
    result: passed ? "PASS" : "FAIL",
    notes,
    device: input.device,
    executionDurationMs: input.executionDurationMs,
  });

  if (!passed) {
    await registerDefectObservation({
      defectId: "DEF-003",
      corridor: input.corridor,
      note: `Automated QA failure captured by ${BACKGROUND_RESUME_TEST_ID}: ${notes}`,
    });
  }

  return entry;
}

export async function executeTransferLifecycleValidation(
  input: TransferLifecycleValidationInput
): Promise<{ entry: QAExecutionLogEntry; validation: TransferLifecycleValidationResult }> {
  const validation = validateTransferLifecycle(input);
  const notes = validation.passed
    ? input.notes?.trim() || "All transfer lifecycle milestones satisfied."
    : `Missing milestones: ${validation.missingMilestones.join(", ")}${input.notes ? ` | ${input.notes}` : ""}`;

  const entry = await logQAExecution({
    testId: TRANSFER_LIFECYCLE_TEST_ID,
    corridor: input.corridor,
    amount: input.amount,
    result: validation.passed ? "PASS" : "FAIL",
    notes,
    device: input.device,
    executionDurationMs: input.executionDurationMs,
  });

  if (!validation.passed) {
    const defectId =
      validation.missingMilestones.includes("Track Screen Updated") ||
      validation.missingMilestones.includes("History Updated")
        ? "DEF-002"
        : "DEF-004";

    await registerDefectObservation({
      defectId,
      corridor: input.corridor,
      note: `Automated QA failure captured by ${TRANSFER_LIFECYCLE_TEST_ID}: ${notes}`,
    });
  }

  return {
    entry,
    validation,
  };
}
