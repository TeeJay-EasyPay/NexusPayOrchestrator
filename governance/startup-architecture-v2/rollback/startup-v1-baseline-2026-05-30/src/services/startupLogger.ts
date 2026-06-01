type StartupStage =
  | "app-bootstrap"
  | "supabase-init"
  | "nexus-ai-init"
  | "fx-provider-init"
  | "routing-init";

type StartupLevel = "INFO" | "WARN" | "ERROR";

type StartupLogPayload = {
  event: string;
  stage: StartupStage;
  status?: "start" | "success" | "failure" | "fallback";
  details?: Record<string, unknown>;
};

function emitStartupLog(level: StartupLevel, payload: StartupLogPayload) {
  const entry = {
    timestamp: new Date().toISOString(),
    category: "startup",
    level,
    ...payload,
  };

  if (level === "ERROR") {
    console.error("[Startup]", entry);
    return;
  }

  if (level === "WARN") {
    console.warn("[Startup]", entry);
    return;
  }

  console.log("[Startup]", entry);
}

export function logStartupInfo(payload: StartupLogPayload) {
  emitStartupLog("INFO", payload);
}

export function logStartupWarn(payload: StartupLogPayload) {
  emitStartupLog("WARN", payload);
}

export function logStartupError(payload: StartupLogPayload) {
  emitStartupLog("ERROR", payload);
}
