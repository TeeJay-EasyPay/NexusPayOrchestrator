import AsyncStorage from "@react-native-async-storage/async-storage";

export type StartupEvidencePhase =
  | "bootstrapping"
  | "unauthenticated"
  | "authenticated"
  | "locked"
  | "unknown";

export type StartupEvidenceRecord = {
  schemaVersion: "startup-v2";
  launchId: string;
  sequence: number;
  updatedAt: string;
  finalAuthPhase: StartupEvidencePhase;
  sessionValidated: boolean;
  hasSession: boolean;
  demoAccessEnabled: boolean;
  redirectReason: string | null;
  startupDestination: string;
  routeReached: string;
  routingDecision: string;
  routeAction: "allow" | "replace" | "unknown";
  startupComplete: boolean;
};

const STARTUP_EVIDENCE_KEY = "@nexuspay/startup-evidence-v2";

let currentLaunchId = `launch-${Date.now()}`;
let inMemoryEvidence: StartupEvidenceRecord = {
  schemaVersion: "startup-v2",
  launchId: currentLaunchId,
  sequence: 0,
  updatedAt: new Date().toISOString(),
  finalAuthPhase: "unknown",
  sessionValidated: false,
  hasSession: false,
  demoAccessEnabled: false,
  redirectReason: null,
  startupDestination: "unknown",
  routeReached: "unknown",
  routingDecision: "unknown",
  routeAction: "unknown",
  startupComplete: false,
};

function emitEvidenceLog(record: StartupEvidenceRecord) {
  console.log(`[StartupEvidence] ${JSON.stringify(record)}`);
}

export async function beginStartupEvidenceLaunch(launchId?: string) {
  if (inMemoryEvidence.sequence > 0) {
    return;
  }

  currentLaunchId = launchId ?? `launch-${Date.now()}`;
  inMemoryEvidence = {
    schemaVersion: "startup-v2",
    launchId: currentLaunchId,
    sequence: 0,
    updatedAt: new Date().toISOString(),
    finalAuthPhase: "bootstrapping",
    sessionValidated: false,
    hasSession: false,
    demoAccessEnabled: false,
    redirectReason: null,
    startupDestination: "unknown",
    routeReached: "unknown",
    routingDecision: "launch-start",
    routeAction: "unknown",
    startupComplete: false,
  };

  emitEvidenceLog(inMemoryEvidence);

  try {
    await AsyncStorage.setItem(STARTUP_EVIDENCE_KEY, JSON.stringify(inMemoryEvidence));
  } catch (error) {
    console.warn("[StartupEvidence] unable to initialize startup evidence", error);
  }
}

export async function upsertStartupEvidence(
  next: Partial<Omit<StartupEvidenceRecord, "launchId" | "updatedAt">>
) {
  const merged: StartupEvidenceRecord = {
    ...inMemoryEvidence,
    ...next,
    schemaVersion: "startup-v2",
    launchId: currentLaunchId,
    updatedAt: new Date().toISOString(),
  };

  inMemoryEvidence = merged;
  emitEvidenceLog(merged);

  try {
    await AsyncStorage.setItem(STARTUP_EVIDENCE_KEY, JSON.stringify(merged));
  } catch (error) {
    console.warn("[StartupEvidence] unable to persist startup evidence", error);
  }
}

export async function getPersistedStartupEvidence(): Promise<StartupEvidenceRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(STARTUP_EVIDENCE_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as StartupEvidenceRecord;
    return parsed;
  } catch (error) {
    console.warn("[StartupEvidence] unable to read persisted startup evidence", error);
    return null;
  }
}
