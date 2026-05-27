import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PilotRunResult } from "./pilotScenarios";

function listFilesSafe(dirPath: string): string[] {
  try {
    return readdirSync(dirPath)
      .map((name) => path.join(dirPath, name))
      .filter((candidate) => statSync(candidate).isFile());
  } catch {
    return [];
  }
}

export function generateEvidencePack(run: PilotRunResult): string {
  mkdirSync(run.artifacts.runDirectory, { recursive: true });

  const screenshotFiles = listFilesSafe(run.artifacts.screenshotsDirectory).map((filePath) =>
    path.relative(run.artifacts.runDirectory, filePath)
  );
  const logFiles = listFilesSafe(run.artifacts.logsDirectory).map((filePath) =>
    path.relative(run.artifacts.runDirectory, filePath)
  );

  const evidencePack = {
    metadata: {
      runId: run.runId,
      scenarioId: run.scenario.scenarioId,
      testId: run.scenario.testId,
      corridor: run.scenario.corridor,
      amount: run.scenario.amount,
      timestampStart: run.startedAt,
      timestampEnd: run.finishedAt,
    },
    outcome: {
      status: run.status,
      reason: run.reason,
      severitySuggestion:
        run.status === "FAIL" ? "HIGH" : run.status === "WARNING" ? "MEDIUM" : "LOW",
    },
    validation: run.validation,
    metrics: {
      totalDurationMs: run.durationMs,
    },
    assets: {
      screenshots: screenshotFiles,
      logs: logFiles,
      junitPath: path.relative(run.artifacts.runDirectory, run.artifacts.junitPath),
    },
    defects: run.defects,
  };

  const evidencePath = path.join(run.artifacts.runDirectory, "evidence-pack.json");
  writeFileSync(evidencePath, JSON.stringify(evidencePack, null, 2));

  return evidencePath;
}
