import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { runCommand } from "./commandUtils";
import { prepareDeviceForStartupLaunch, runEmulatorBaseline } from "./emulatorExecutionLayer";
import { ensureMetroRunning } from "./metroOrchestrator";

type StartupCycleEvidence = {
  cycle: number;
  startedAt: string;
  finishedAt: string;
  startupDestination: string;
  authenticationState: "bootstrapping" | "unauthenticated" | "authenticated" | "locked" | "unknown";
  sessionState: "present" | "missing" | "unknown";
  startupComplete: boolean;
  routingDecision: string;
  redirects: string[];
  unexpectedTransitions: string[];
  result: "PASS" | "FAIL";
  rawStartupLines: string[];
  notes: string[];
};

type StartupValidationReport = {
  generatedAt: string;
  runId: string;
  cycleCount: number;
  deterministic: boolean;
  expectedFlow: "authenticated-home" | "unauthenticated-login" | "mixed" | "unknown";
  summary: {
    authenticatedHomeCycles: number;
    unauthenticatedLoginCycles: number;
    unstableCycles: number;
    unknownCycles: number;
  };
  baseline: {
    ready: boolean;
    deviceId: string | null;
    packageLaunched: boolean;
    notes: string[];
    artifacts: {
      baselineLogPath: string;
    };
  };
  cycles: StartupCycleEvidence[];
};

const APP_PACKAGE = "com.nexuspay.orchestrator";
const DEFAULT_CYCLE_COUNT = 20;
const DEFAULT_WAIT_AFTER_LAUNCH_MS = 25000;
const DEFAULT_DEV_CLIENT_URL =
  "exp+nexuspayorchestrator://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081";

function nowRunId(): string {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function ensureDir(target: string): void {
  mkdirSync(target, { recursive: true });
}

function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldCaptureUiDumps(): boolean {
  return process.env.STARTUP_USE_UIAUTOMATOR === "true";
}

async function captureLogcat(deviceId: string) {
  return runCommand(
    "adb",
    ["-s", deviceId, "logcat", "-d", "-v", "time"],
    {
      allowFailure: true,
      timeoutMs: 60000,
    }
  );
}

async function waitForStartupTelemetry(
  deviceId: string,
  waitMs: number
): Promise<{ logcat: string; timedOut: boolean }> {
  const deadline = Date.now() + waitMs;
  let latestLogcat = "";

  while (Date.now() < deadline) {
    await waitFor(2000);

    const logcat = await captureLogcat(deviceId);
    latestLogcat = logcat.stdout || logcat.stderr || "";

    const evidence = parseStartupEvidence(latestLogcat);
    if (evidence.startupComplete === true) {
      return { logcat: latestLogcat, timedOut: false };
    }
  }

  return { logcat: latestLogcat, timedOut: true };
}

function parseBooleanField(line: string, field: string): boolean | null {
  const jsonLike = new RegExp(`"${field}"\\s*:\\s*(true|false)`, "i");
  const objectLike = new RegExp(`${field}\\s*:\\s*(true|false)`, "i");

  const jsonMatch = line.match(jsonLike);
  if (jsonMatch?.[1]) return jsonMatch[1].toLowerCase() === "true";

  const objectMatch = line.match(objectLike);
  if (objectMatch?.[1]) return objectMatch[1].toLowerCase() === "true";

  return null;
}

function parseStringField(line: string, field: string): string | null {
  const jsonLike = new RegExp(`"${field}"\\s*:\\s*"([^"\\n]+)"`, "i");
  const objectLikeSingle = new RegExp(`${field}\\s*:\\s*'([^'\\n]+)'`, "i");
  const objectLikeDouble = new RegExp(`${field}\\s*:\\s*"([^"\\n]+)"`, "i");

  const jsonMatch = line.match(jsonLike);
  if (jsonMatch?.[1]) return jsonMatch[1];

  const objectMatchSingle = line.match(objectLikeSingle);
  if (objectMatchSingle?.[1]) return objectMatchSingle[1];

  const objectMatchDouble = line.match(objectLikeDouble);
  if (objectMatchDouble?.[1]) return objectMatchDouble[1];

  return null;
}

function parseStartupLog(logcat: string): {
  startupDestination: string;
  authenticationState: StartupCycleEvidence["authenticationState"];
  sessionState: StartupCycleEvidence["sessionState"];
  routingDecision: string;
  redirects: string[];
  rawStartupLines: string[];
  notes: string[];
} {
  const rawStartupLines = logcat
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("[Startup]"));

  const notes: string[] = [];
  let lastPathname: string | null = null;
  let finalAuthPhase: StartupCycleEvidence["authenticationState"] = "unknown";
  let hasSession: boolean | null = null;
  const redirects: string[] = [];

  for (const line of rawStartupLines) {
    const pathname = parseStringField(line, "pathname");
    if (pathname) {
      lastPathname = pathname;
    }

    const phase = parseStringField(line, "finalAuthPhase");
    if (
      phase === "bootstrapping" ||
      phase === "unauthenticated" ||
      phase === "authenticated" ||
      phase === "locked"
    ) {
      finalAuthPhase = phase;
    }

    const sessionFlag = parseBooleanField(line, "hasSession");
    if (sessionFlag !== null) {
      hasSession = sessionFlag;
    }

    const event = parseStringField(line, "event");
    if (event === "routing-redirect" || event === "startup-v2-route-replace") {
      const from = parseStringField(line, "from") ?? "unknown";
      const to = parseStringField(line, "to") ?? "unknown";
      redirects.push(`${from}->${to}`);
      lastPathname = to;
    }
  }

  if (rawStartupLines.length === 0) {
    notes.push("No [Startup] lines found in ReactNativeJS logcat output.");
  }

  let routingDecision = "unknown";
  if (redirects.length > 0) {
    routingDecision = `redirect:${redirects[redirects.length - 1]}`;
  } else if (lastPathname) {
    routingDecision = `settled:${lastPathname}`;
  }

  let startupDestination = lastPathname ?? "unknown";
  if (startupDestination === "unknown" && finalAuthPhase === "unauthenticated") {
    startupDestination = "/auth";
    notes.push("Destination inferred from unauthenticated finalAuthPhase.");
  }

  if (startupDestination === "unknown" && finalAuthPhase === "authenticated") {
    startupDestination = "/";
    notes.push("Destination inferred from authenticated finalAuthPhase.");
  }

  const sessionState: StartupCycleEvidence["sessionState"] =
    hasSession === null ? "unknown" : hasSession ? "present" : "missing";

  return {
    startupDestination,
    authenticationState: finalAuthPhase,
    sessionState,
    routingDecision,
    redirects,
    rawStartupLines,
    notes,
  };
}

function parseStartupEvidence(logcat: string): {
  finalAuthPhase: StartupCycleEvidence["authenticationState"];
  sessionValidated: boolean | null;
  hasSession: boolean | null;
  demoAccessEnabled: boolean | null;
  redirectReason: string | null;
  startupDestination: string;
  routeReached: string;
  routingDecision: string;
  routeAction: string;
  startupComplete: boolean | null;
  notes: string[];
} {
  const lines = logcat
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("[StartupEvidence]"));

  let latest: {
    finalAuthPhase?: StartupCycleEvidence["authenticationState"];
    sessionValidated?: boolean;
    hasSession?: boolean;
    demoAccessEnabled?: boolean;
    redirectReason?: string | null;
    startupDestination?: string;
    routeReached?: string;
    routingDecision?: string;
    routeAction?: string;
    startupComplete?: boolean;
  } | null = null;

  for (const line of lines) {
    const jsonStart = line.indexOf("{");
    if (jsonStart < 0) continue;

    try {
      const parsed = JSON.parse(line.slice(jsonStart)) as {
        finalAuthPhase?: StartupCycleEvidence["authenticationState"];
        sessionValidated?: boolean;
        hasSession?: boolean;
        demoAccessEnabled?: boolean;
        redirectReason?: string | null;
        startupDestination?: string;
        routeReached?: string;
        routingDecision?: string;
        routeAction?: string;
        startupComplete?: boolean;
      };

      latest = parsed;
    } catch {
      // Ignore malformed evidence log lines.
    }
  }

  const notes: string[] = [];

  if (!latest) {
    notes.push("No [StartupEvidence] records found in logcat output.");
    return {
      finalAuthPhase: "unknown",
      sessionValidated: null,
      hasSession: null,
      demoAccessEnabled: null,
      redirectReason: null,
      startupDestination: "unknown",
      routeReached: "unknown",
      routingDecision: "unknown",
      routeAction: "unknown",
      startupComplete: null,
      notes,
    };
  }

  return {
    finalAuthPhase: latest.finalAuthPhase ?? "unknown",
    sessionValidated: typeof latest.sessionValidated === "boolean" ? latest.sessionValidated : null,
    hasSession: typeof latest.hasSession === "boolean" ? latest.hasSession : null,
    demoAccessEnabled: typeof latest.demoAccessEnabled === "boolean" ? latest.demoAccessEnabled : null,
    redirectReason: latest.redirectReason ?? null,
    startupDestination: latest.startupDestination ?? "unknown",
    routeReached: latest.routeReached ?? "unknown",
    routingDecision: latest.routingDecision ?? "unknown",
    routeAction: latest.routeAction ?? "unknown",
    startupComplete: typeof latest.startupComplete === "boolean" ? latest.startupComplete : null,
    notes,
  };
}

function inferDestinationFromUiDump(xml: string): {
  destination: string;
  authState: StartupCycleEvidence["authenticationState"];
  sessionState: StartupCycleEvidence["sessionState"];
  indicator: string;
} {
  const lower = xml.toLowerCase();

  if (lower.includes("sign in securely") || lower.includes("create secure account")) {
    return {
      destination: "/auth",
      authState: "unauthenticated",
      sessionState: "missing",
      indicator: "ui-auth-screen",
    };
  }

  if (
    lower.includes("nexuspay v") ||
    lower.includes("send money") ||
    lower.includes("good morning") ||
    lower.includes("good afternoon") ||
    lower.includes("good evening")
  ) {
    return {
      destination: "/",
      authState: "authenticated",
      sessionState: "present",
      indicator: "ui-home-screen",
    };
  }

  return {
    destination: "unknown",
    authState: "unknown",
    sessionState: "unknown",
    indicator: "ui-unknown",
  };
}

function classifyDeterminism(cycles: StartupCycleEvidence[]): {
  deterministic: boolean;
  expectedFlow: StartupValidationReport["expectedFlow"];
  summary: StartupValidationReport["summary"];
} {
  let authenticatedHomeCycles = 0;
  let unauthenticatedLoginCycles = 0;
  let unstableCycles = 0;
  let unknownCycles = 0;

  for (const cycle of cycles) {
    const isAuthenticatedHome =
      cycle.authenticationState === "authenticated" && cycle.startupDestination === "/";
    const isUnauthenticatedLogin =
      cycle.authenticationState === "unauthenticated" && cycle.startupDestination === "/auth";

    if (isAuthenticatedHome) {
      authenticatedHomeCycles += 1;
      continue;
    }

    if (isUnauthenticatedLogin) {
      unauthenticatedLoginCycles += 1;
      continue;
    }

    if (cycle.authenticationState === "unknown" || cycle.startupDestination === "unknown") {
      unknownCycles += 1;
      continue;
    }

    unstableCycles += 1;
  }

  const deterministic =
    unstableCycles === 0 &&
    unknownCycles === 0 &&
    cycles.length > 0 &&
    cycles.every((cycle) => cycle.result === "PASS" && cycle.unexpectedTransitions.length === 0);

  const expectedFlow: StartupValidationReport["expectedFlow"] =
    authenticatedHomeCycles > 0 && unauthenticatedLoginCycles === 0
      ? "authenticated-home"
      : unauthenticatedLoginCycles > 0 && authenticatedHomeCycles === 0
        ? "unauthenticated-login"
        : authenticatedHomeCycles > 0 && unauthenticatedLoginCycles > 0
          ? "mixed"
          : "unknown";

  return {
    deterministic,
    expectedFlow,
    summary: {
      authenticatedHomeCycles,
      unauthenticatedLoginCycles,
      unstableCycles,
      unknownCycles,
    },
  };
}

function toMarkdown(report: StartupValidationReport): string {
  const lines: string[] = [];

  lines.push("# Startup Determinism Validation Report");
  lines.push("");
  lines.push(`- Generated At: ${report.generatedAt}`);
  lines.push(`- Run ID: ${report.runId}`);
  lines.push(`- Cycle Count: ${report.cycleCount}`);
  lines.push(`- Deterministic: ${report.deterministic ? "YES" : "NO"}`);
  lines.push(`- Expected Flow: ${report.expectedFlow}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Authenticated->Home cycles: ${report.summary.authenticatedHomeCycles}`);
  lines.push(`- Unauthenticated->Login cycles: ${report.summary.unauthenticatedLoginCycles}`);
  lines.push(`- Unstable cycles: ${report.summary.unstableCycles}`);
  lines.push(`- Unknown cycles: ${report.summary.unknownCycles}`);
  lines.push("");
  lines.push("## Baseline");
  lines.push("");
  lines.push(`- Baseline Ready: ${report.baseline.ready}`);
  lines.push(`- Device ID: ${report.baseline.deviceId ?? "none"}`);
  lines.push(`- Package Launched: ${report.baseline.packageLaunched}`);
  lines.push("");
  lines.push("## Cycle Evidence");
  lines.push("");
  lines.push("| Cycle | Result | Destination | Auth State | Session State | Startup Complete | Routing Decision | Redirects | Unexpected Transitions | Notes |\n|---:|---|---|---|---|---|---|---|---|---|");

  for (const cycle of report.cycles) {
    lines.push(
      `| ${cycle.cycle} | ${cycle.result} | ${cycle.startupDestination} | ${cycle.authenticationState} | ${cycle.sessionState} | ${cycle.startupComplete ? "true" : "false"} | ${cycle.routingDecision} | ${cycle.redirects.join(", ") || "none"} | ${cycle.unexpectedTransitions.join(", ") || "none"} | ${cycle.notes.join("; ") || "none"} |`
    );
  }

  lines.push("");
  lines.push("## Pass/Fail Matrix");
  lines.push("");
  lines.push("| Cycle | PASS | FAIL |\n|---:|:---:|:---:|");

  for (const cycle of report.cycles) {
    lines.push(`| ${cycle.cycle} | ${cycle.result === "PASS" ? "X" : ""} | ${cycle.result === "FAIL" ? "X" : ""} |`);
  }

  return lines.join("\n");
}

async function runCycle(deviceId: string, cycle: number, waitMs: number): Promise<StartupCycleEvidence> {
  const startedAt = new Date().toISOString();
  const notes: string[] = [];

  await runCommand("adb", ["-s", deviceId, "logcat", "-c"], {
    allowFailure: true,
    timeoutMs: 15000,
  });

  await runCommand("adb", ["-s", deviceId, "shell", "am", "force-stop", APP_PACKAGE], {
    allowFailure: true,
    timeoutMs: 20000,
  });

  await prepareDeviceForStartupLaunch(deviceId, notes);

  const launch = await runCommand(
    "adb",
    [
      "-s",
      deviceId,
      "shell",
      "am",
      "start",
      "-W",
      "-a",
      "android.intent.action.VIEW",
      "-d",
      process.env.EXPO_DEV_CLIENT_URL ?? DEFAULT_DEV_CLIENT_URL,
      APP_PACKAGE,
    ],
    {
      allowFailure: true,
      timeoutMs: 60000,
    }
  );

  if (launch.code !== 0) {
    notes.push(`Launch command warning: ${launch.stderr || launch.stdout}`);
  }

  let earlyUiDump = "";
  let finalUiDump = "";
  let logcatText = "";

  if (shouldCaptureUiDumps()) {
    const earlyWaitMs = Math.max(2000, Math.min(4000, Math.floor(waitMs / 2)));
    const finalWaitMs = Math.max(2000, waitMs - earlyWaitMs);

    await waitFor(earlyWaitMs);

    const earlyDumpPath = `/sdcard/nexuspay-startup-cycle-${cycle}-early.xml`;

    await runCommand(
      "adb",
      ["-s", deviceId, "shell", "uiautomator", "dump", earlyDumpPath],
      {
        allowFailure: true,
        timeoutMs: 20000,
      }
    );

    const earlyUi = await runCommand(
      "adb",
      ["-s", deviceId, "shell", "cat", earlyDumpPath],
      {
        allowFailure: true,
        timeoutMs: 15000,
      }
    );
    earlyUiDump = earlyUi.stdout || "";

    await waitFor(finalWaitMs);

    const finalDumpPath = `/sdcard/nexuspay-startup-cycle-${cycle}-final.xml`;

    await runCommand(
      "adb",
      ["-s", deviceId, "shell", "uiautomator", "dump", finalDumpPath],
      {
        allowFailure: true,
        timeoutMs: 20000,
      }
    );

    const finalUi = await runCommand(
      "adb",
      ["-s", deviceId, "shell", "cat", finalDumpPath],
      {
        allowFailure: true,
        timeoutMs: 15000,
      }
    );
    finalUiDump = finalUi.stdout || "";
  } else {
    notes.push("UIAutomator fallback disabled; Startup V2 telemetry is the validation source of truth.");
    const telemetry = await waitForStartupTelemetry(deviceId, waitMs);
    logcatText = telemetry.logcat;

    if (telemetry.timedOut) {
      notes.push(`Startup V2 telemetry wait exhausted after ${waitMs}ms.`);
    }
  }

  const logcat = logcatText ? null : await captureLogcat(deviceId);

  if (logcat && logcat.code !== 0) {
    notes.push(`Logcat capture warning: ${logcat.stderr || logcat.stdout}`);
  }

  const capturedLogcat = logcatText || logcat?.stdout || logcat?.stderr || "";
  const parsed = parseStartupLog(capturedLogcat);
  const parsedEvidence = parseStartupEvidence(capturedLogcat);
  const earlyUi = inferDestinationFromUiDump(earlyUiDump);
  const finalUi = inferDestinationFromUiDump(finalUiDump);

  let startupDestination = parsedEvidence.startupDestination;
  let authenticationState = parsedEvidence.finalAuthPhase;
  let sessionState: StartupCycleEvidence["sessionState"] =
    parsedEvidence.hasSession !== null
      ? parsedEvidence.hasSession || parsedEvidence.demoAccessEnabled
        ? "present"
        : "missing"
      : parsedEvidence.sessionValidated === null
      ? "unknown"
      : parsedEvidence.sessionValidated
        ? parsed.sessionState
        : "missing";
  let routingDecision =
    parsedEvidence.routingDecision !== "unknown"
      ? parsedEvidence.routingDecision
      : parsedEvidence.routeReached !== "unknown"
        ? `settled:${parsedEvidence.routeReached}`
        : parsed.routingDecision;
  const redirects = [...parsed.redirects];
  const unexpectedTransitions: string[] = [];
  const startupComplete = parsedEvidence.startupComplete === true;

  if (parsedEvidence.redirectReason) {
    routingDecision = `redirect-reason:${parsedEvidence.redirectReason}`;
  }

  if (startupDestination === "unknown" && finalUi.destination !== "unknown") {
    startupDestination = finalUi.destination;
    authenticationState = finalUi.authState;
    sessionState = finalUi.sessionState;
    routingDecision = `settled:${finalUi.destination}`;
    notes.push(`startup inferred from UI dump (${finalUi.indicator})`);
  }

  if (earlyUi.destination !== "unknown" && finalUi.destination !== "unknown" && earlyUi.destination !== finalUi.destination) {
    redirects.push(`${earlyUi.destination}->${finalUi.destination}`);
    unexpectedTransitions.push(`${earlyUi.destination}->${finalUi.destination}`);
    routingDecision = `redirect:${earlyUi.destination}->${finalUi.destination}`;
  }

  if (parsedEvidence.startupComplete === false) {
    notes.push("Latest StartupEvidence record did not mark startupComplete=true.");
  }

  const result: StartupCycleEvidence["result"] =
    unexpectedTransitions.length === 0 &&
    startupComplete &&
    ((authenticationState === "unauthenticated" && startupDestination === "/auth") ||
    (authenticationState === "authenticated" && startupDestination === "/"))
      ? "PASS"
      : "FAIL";

  const finishedAt = new Date().toISOString();

  return {
    cycle,
    startedAt,
    finishedAt,
    startupDestination,
    authenticationState,
    sessionState,
    startupComplete,
    routingDecision,
    redirects,
    unexpectedTransitions,
    result,
    rawStartupLines: parsed.rawStartupLines,
    notes: [...notes, ...parsed.notes, ...parsedEvidence.notes],
  };
}

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const runId = nowRunId();
  const cycleCount = Number(process.env.STARTUP_CYCLE_COUNT ?? DEFAULT_CYCLE_COUNT);
  const waitAfterLaunchMs = Number(
    process.env.STARTUP_WAIT_AFTER_LAUNCH_MS ?? DEFAULT_WAIT_AFTER_LAUNCH_MS
  );

  const dayFolder = new Date().toISOString().slice(0, 10);
  const outputRoot = path.join(
    repoRoot,
    "governance",
    "automation",
    "outputs",
    dayFolder,
    `startup-determinism-${runId}`
  );

  ensureDir(outputRoot);

  const metro = await ensureMetroRunning(repoRoot, outputRoot);

  try {
    const baseline = await runEmulatorBaseline(repoRoot, outputRoot);
    const cycles: StartupCycleEvidence[] = [];

    if (baseline.deviceId) {
      for (let cycle = 1; cycle <= cycleCount; cycle += 1) {
        const cycleEvidence = await runCycle(baseline.deviceId, cycle, waitAfterLaunchMs);
        cycles.push(cycleEvidence);
        console.log(
          `startup-cycle-${cycle} => destination=${cycleEvidence.startupDestination}, auth=${cycleEvidence.authenticationState}, routing=${cycleEvidence.routingDecision}`
        );
      }
    }

    const classified = classifyDeterminism(cycles);

    const report: StartupValidationReport = {
      generatedAt: new Date().toISOString(),
      runId,
      cycleCount,
      deterministic: classified.deterministic,
      expectedFlow: classified.expectedFlow,
      summary: classified.summary,
      baseline: {
        ...baseline,
        notes: [
          ...baseline.notes,
          `metro_url=${metro.url}`,
          `metro_was_already_running=${metro.wasAlreadyRunning}`,
          `metro_log_path=${metro.logPath}`,
        ],
      },
      cycles,
    };

    const jsonPath = path.join(outputRoot, "startup-determinism-results.json");
    const markdownPath = path.join(outputRoot, "startup-determinism-results.md");

    writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    writeFileSync(markdownPath, toMarkdown(report));

    const latestDir = path.join(repoRoot, "governance", "automation", "outputs", "latest");
    ensureDir(latestDir);
    writeFileSync(path.join(latestDir, "startup-determinism-results.json"), JSON.stringify(report, null, 2));

    console.log("Startup determinism artifacts generated:");
    console.log(`- ${jsonPath}`);
    console.log(`- ${markdownPath}`);
  } finally {
    await metro.stop();
  }
}

main().catch((error) => {
  console.error("Startup determinism runner failed", error);
  process.exitCode = 1;
});
