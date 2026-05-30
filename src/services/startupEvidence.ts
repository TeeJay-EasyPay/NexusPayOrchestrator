import AsyncStorage from "@react-native-async-storage/async-storage";

export type StartupEvidencePhase =
  | "bootstrapping"
  | "unauthenticated"
  | "authenticated"
  | "locked"
  | "unknown";

export type StartupEvidenceRecord = {
  launchId: string;
  updatedAt: string;
  finalAuthPhase: StartupEvidencePhase;
  sessionValidated: boolean;
  redirectReason: string | null;
  startupDestination: string;
  routeReached: string;
};

const STARTUP_EVIDENCE_KEY = "@nexuspay/startup-evidence-v1";

let currentLaunchId = `launch-${Date.now()}`;
let inMemoryEvidence: StartupEvidenceRecord = {
  launchId: currentLaunchId,
  updatedAt: new Date().toISOString(),
  finalAuthPhase: "unknown",
  sessionValidated: false,
  redirectReason: null,
  startupDestination: "unknown",
  routeReached: "unknown",
};

function emitEvidenceLog(record: StartupEvidenceRecord) {
  console.log("[StartupEvidence]", JSON.stringify(record));
}

export async function beginStartupEvidenceLaunch(launchId?: string) {
  currentLaunchId = launchId ?? `launch-${Date.now()}`;
  inMemoryEvidence = {
    launchId: currentLaunchId,
    updatedAt: new Date().toISOString(),
    finalAuthPhase: "bootstrapping",
    sessionValidated: false,
    redirectReason: null,
    startupDestination: "unknown",
    routeReached: "unknown",
  };

  try {
    await AsyncStorage.setItem(STARTUP_EVIDENCE_KEY, JSON.stringify(inMemoryEvidence));
    emitEvidenceLog(inMemoryEvidence);
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
    launchId: currentLaunchId,
    updatedAt: new Date().toISOString(),
  };

  inMemoryEvidence = merged;

  try {
    await AsyncStorage.setItem(STARTUP_EVIDENCE_KEY, JSON.stringify(merged));
    emitEvidenceLog(merged);
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
