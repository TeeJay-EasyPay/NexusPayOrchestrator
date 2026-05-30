import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { runCommand } from "./commandUtils";
import { discoverDefectsForRun } from "./defectDiscovery";
import { runEmulatorBaseline } from "./emulatorExecutionLayer";
import { generateEvidencePack } from "./evidencePackGenerator";
import { ensureMetroRunning } from "./metroOrchestrator";
import {
    getPilotScenarios,
    PilotAggregateSummary,
    PilotOutcome,
    PilotRunResult,
    ValidationChecks,
} from "./pilotScenarios";
import {
    writeCertificationSummary,
    writeExecutiveSummary,
    writeFounderBriefingDraft,
} from "./reportGenerators";

type PilotRecorderInput = {
  testId: string;
  status: "PASS" | "WARNING" | "FAIL";
  executionDurationMs: number;
  notes?: string;
  evidenceReference?: string;
  device?: string;
  validation: ValidationChecks;
};

function installNodeLocalStorage(repoRoot: string): void {
  const storageDir = path.join(repoRoot, "governance", "automation", "outputs", "latest");
  const storageFile = path.join(storageDir, "node-localstorage.json");
  ensureDir(storageDir);

  const readStore = (): Record<string, string> => {
    if (!existsSync(storageFile)) {
      return {};
    }

    try {
      const raw = readFileSync(storageFile, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") {
        return {};
      }

      return parsed as Record<string, string>;
    } catch {
      return {};
    }
  };

  const writeStore = (data: Record<string, string>): void => {
    writeFileSync(storageFile, JSON.stringify(data, null, 2));
  };

  const localStorageImpl = {
    getItem: (key: string) => {
      const data = readStore();
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem: (key: string, value: string) => {
      const data = readStore();
      data[key] = value;
      writeStore(data);
    },
    removeItem: (key: string) => {
      const data = readStore();
      delete data[key];
      writeStore(data);
    },
    clear: () => {
      writeStore({});
    },
  };

  const globalObj = globalThis as {
    window?: { localStorage?: typeof localStorageImpl };
    localStorage?: typeof localStorageImpl;
  };

  if (!globalObj.window) {
    globalObj.window = {};
  }

  globalObj.window.localStorage = localStorageImpl;
  globalObj.localStorage = localStorageImpl;
}

async function recordPilotRunInQaStore(
  repoRoot: string,
  result: PilotRunResult
): Promise<void> {
  if (process.env.NEXUSPAY_ENABLE_APP_STORE_SYNC !== "true") {
    return;
  }

  try {
    installNodeLocalStorage(repoRoot);

    const recorderModule = await import(
      "../../../src/testing/automation/pilotCertificationRecorder"
    );

    const payload: PilotRecorderInput = {
      testId: result.scenario.testId,
      status: result.status,
      executionDurationMs: result.durationMs,
      notes: result.reason,
      evidenceReference: result.artifacts.evidencePackPath,
      device: "android-emulator-pilot",
      validation: result.validation,
    };

    await recorderModule.recordPilotCertificationRun(payload);
  } catch (error) {
    console.warn(
      "Pilot runner warning: unable to update QA AsyncStorage defect/log modules in Node runtime.",
      error
    );
  }
}

function nowRunId(): string {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function ensureDir(target: string): void {
  mkdirSync(target, { recursive: true });
}

function hasScreenshot(screenshotsDir: string, token: string): boolean {
  try {
    return readdirSync(screenshotsDir).some((name) => name.includes(token));
  } catch {
    return false;
  }
}

function buildValidation(screenshotsDir: string, maestroSucceeded: boolean): ValidationChecks {
  const routeGenerated = hasScreenshot(screenshotsDir, "route-generated");
  const transferInitiated = hasScreenshot(screenshotsDir, "transfer-initiated");
  const executionProgressed = hasScreenshot(screenshotsDir, "execution-progress");
  const settlementCompleted = hasScreenshot(screenshotsDir, "settlement-proof");
  const payoutCompleted = hasScreenshot(screenshotsDir, "payout-completed");
  const historyUpdated = hasScreenshot(screenshotsDir, "history-updated");
  const trackCompleted = hasScreenshot(screenshotsDir, "track-completed");

  return {
    routeGenerated,
    transferInitiated,
    executionProgressed: executionProgressed || (maestroSucceeded && transferInitiated),
    settlementCompleted,
    payoutCompleted,
    historyUpdated,
    trackCompleted,
    crossScreenConsistent: historyUpdated && trackCompleted,
  };
}

function classifyOutcome(maestroSucceeded: boolean, validation: ValidationChecks): {
  status: PilotOutcome;
  reason: string;
} {
  const mandatoryChecks = [
    validation.routeGenerated,
    validation.transferInitiated,
    validation.executionProgressed,
    validation.settlementCompleted,
    validation.payoutCompleted,
    validation.historyUpdated,
    validation.trackCompleted,
    validation.crossScreenConsistent,
  ];

  if (maestroSucceeded && mandatoryChecks.every(Boolean)) {
    return {
      status: "PASS",
      reason: "All pilot validation checks passed.",
    };
  }

  if (maestroSucceeded && validation.routeGenerated && validation.transferInitiated) {
    return {
      status: "WARNING",
      reason: "Core flow ran but one or more completion checks were missing.",
    };
  }

  return {
    status: "FAIL",
    reason: "Pilot flow failed or mandatory validation checks did not complete.",
  };
}

async function runScenario(
  repoRoot: string,
  runId: string,
  outputRoot: string,
  scenario: ReturnType<typeof getPilotScenarios>[number],
  deviceId: string | null
): Promise<PilotRunResult> {
  const startedAt = new Date().toISOString();
  const started = Date.now();

  const runDirectory = path.join(outputRoot, scenario.scenarioId);
  const screenshotsDirectory = path.join(runDirectory, "screenshots");
  const logsDirectory = path.join(runDirectory, "logs");
  const junitPath = path.join(runDirectory, "maestro-junit.xml");

  ensureDir(screenshotsDirectory);
  ensureDir(logsDirectory);

  const maestroArgs = [
    "test",
    scenario.maestroFlowPath,
    "--format",
    "junit",
    "--output",
    junitPath,
    "--env",
    `RUN_OUTPUT_DIR=${screenshotsDirectory}`,
    "--env",
    `RUN_LABEL=${scenario.scenarioId}`,
  ];

  if (deviceId) {
    maestroArgs.push("--device", deviceId);
  }

  const maestro = await runCommand("maestro", maestroArgs, {
    cwd: repoRoot,
    allowFailure: true,
    timeoutMs: 300000,
  });

  writeFileSync(path.join(logsDirectory, "maestro-stdout.log"), maestro.stdout || "");
  writeFileSync(path.join(logsDirectory, "maestro-stderr.log"), maestro.stderr || "");

  const adbLog = await runCommand("adb", ["logcat", "-d"], {
    allowFailure: true,
    timeoutMs: 30000,
  });
  writeFileSync(path.join(logsDirectory, "adb-logcat.log"), adbLog.stdout || adbLog.stderr || "");

  const validation = buildValidation(screenshotsDirectory, maestro.code === 0);
  const classified = classifyOutcome(maestro.code === 0, validation);
  const finishedAt = new Date().toISOString();

  const defects = discoverDefectsForRun({
    testId: scenario.testId,
    corridor: scenario.corridor,
    status: classified.status,
    reason:
      classified.status === "FAIL"
        ? `${classified.reason} Maestro stderr: ${maestro.stderr || "none"}`
        : classified.reason,
    validation,
  });

  const provisionalResult: PilotRunResult = {
    scenario,
    runId,
    status: classified.status,
    reason: classified.reason,
    startedAt,
    finishedAt,
    durationMs: Date.now() - started,
    validation,
    artifacts: {
      runDirectory,
      junitPath,
      screenshotsDirectory,
      logsDirectory,
      evidencePackPath: path.join(runDirectory, "evidence-pack.json"),
    },
    defects,
  };

  const evidencePackPath = generateEvidencePack(provisionalResult);

  return {
    ...provisionalResult,
    artifacts: {
      ...provisionalResult.artifacts,
      evidencePackPath,
    },
  };
}

function aggregate(runId: string, results: PilotRunResult[]): PilotAggregateSummary {
  const pass = results.filter((result) => result.status === "PASS").length;
  const warning = results.filter((result) => result.status === "WARNING").length;
  const fail = results.filter((result) => result.status === "FAIL").length;
  const total = results.length;

  return {
    generatedAt: new Date().toISOString(),
    runId,
    total,
    pass,
    warning,
    fail,
    passRate: total === 0 ? 0 : (pass / total) * 100,
    failRate: total === 0 ? 0 : (fail / total) * 100,
    results,
    evidenceReferences: results.map((result) => result.artifacts.evidencePackPath),
  };
}

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const runId = nowRunId();
  const dayFolder = new Date().toISOString().slice(0, 10);
  const outputRoot = path.join(
    repoRoot,
    "governance",
    "automation",
    "outputs",
    dayFolder,
    `pilot-${runId}`
  );

  ensureDir(outputRoot);

  const metro = await ensureMetroRunning(repoRoot, outputRoot);

  try {
    const baseline = await runEmulatorBaseline(repoRoot, outputRoot);
    baseline.notes.push(`metro_url=${metro.url}`);
    baseline.notes.push(`metro_was_already_running=${metro.wasAlreadyRunning}`);
    baseline.notes.push(`metro_log_path=${metro.logPath}`);

    if (!baseline.ready) {
      console.warn("Pilot runner warning: emulator baseline is not ready. Scenario runs may fail.");
    }

    const scenarios = getPilotScenarios(repoRoot);
    const results: PilotRunResult[] = [];

    for (const scenario of scenarios) {
      const result = await runScenario(repoRoot, runId, outputRoot, scenario, baseline.deviceId);
      await recordPilotRunInQaStore(repoRoot, result);
      results.push(result);
      console.log(`${scenario.scenarioId} => ${result.status}`);
    }

    const summary = aggregate(runId, results);
  const summaryPath = path.join(outputRoot, "pilot-certification-summary.json");
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  writeFileSync(
    path.join(outputRoot, "pilot-defect-actions.json"),
    JSON.stringify(
      results.map((result) => ({
        testId: result.scenario.testId,
        corridor: result.scenario.corridor,
        amount: result.scenario.amount,
        status: result.status,
        defects: result.defects,
        evidencePackPath: result.artifacts.evidencePackPath,
      })),
      null,
      2
    )
  );

  const certificationSummaryPath = writeCertificationSummary(outputRoot, summary);
  const founderBriefingPath = writeFounderBriefingDraft(outputRoot, summary);
  const executiveSummaryPath = writeExecutiveSummary(outputRoot, summary);

  const latestDir = path.join(repoRoot, "governance", "automation", "outputs", "latest");
  ensureDir(latestDir);
  writeFileSync(path.join(latestDir, "pilot-certification-summary.json"), JSON.stringify(summary, null, 2));

  const indexPath = path.join(outputRoot, "artifact-index.json");
  writeFileSync(
    indexPath,
    JSON.stringify(
      {
        runId,
        baseline,
        summaryPath,
        certificationSummaryPath,
        founderBriefingPath,
        executiveSummaryPath,
      },
      null,
      2
    )
  );

  console.log("Pilot certification artifacts generated:");
  console.log(`- ${summaryPath}`);
  console.log(`- ${certificationSummaryPath}`);
  console.log(`- ${founderBriefingPath}`);
  console.log(`- ${executiveSummaryPath}`);
  } finally {
    await metro.stop();
  }
}

main().catch((error) => {
  console.error("Pilot certification runner failed", error);
  process.exitCode = 1;
});
