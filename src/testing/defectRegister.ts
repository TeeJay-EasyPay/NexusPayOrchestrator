import AsyncStorage from "@react-native-async-storage/async-storage";

import { isSupabaseConfigured, supabase } from "../lib/supabase";

export type DefectSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type DefectStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "MONITORING";

export type DefectRecord = {
  defectId: string;
  title: string;
  severity: DefectSeverity;
  corridor: string;
  description: string;
  screenshots: string[];
  reproductionSteps: string[];
  firstSeen: string;
  status: DefectStatus;
};

export type DefectObservationInput = {
  defectId: string;
  corridor: string;
  note: string;
  screenshotPath?: string;
};

const DEFECT_REGISTER_STORAGE_KEY = "nexuspay.qa.defectRegister.v1";

const INITIAL_DEFECTS: DefectRecord[] = [
  {
    defectId: "DEF-001",
    title: "Saudi corridor intermittently hangs",
    severity: "CRITICAL",
    corridor: "GBP->SAR",
    description:
      "Execution for Saudi corridor occasionally hangs after route and funding validation, preventing timely settlement completion.",
    screenshots: [],
    reproductionSteps: [
      "Open Send Money and choose Saudi Arabia as recipient destination.",
      "Create transfer and select available route.",
      "Authorize funding and begin execution.",
      "Observe execution timeline for potential stall before completion.",
    ],
    firstSeen: "2026-05-24T00:00:00.000Z",
    status: "OPEN",
  },
  {
    defectId: "DEF-002",
    title: "Transaction visible in History but not completed in Track screen",
    severity: "HIGH",
    corridor: "MULTI",
    description:
      "Completed transaction can appear in transaction history while Track screen remains incomplete or stale.",
    screenshots: [],
    reproductionSteps: [
      "Execute transfer to completion flow.",
      "Navigate to Account transaction history and confirm entry exists.",
      "Open Track screen for same transfer.",
      "Validate whether lifecycle status reaches completed.",
    ],
    firstSeen: "2026-05-24T00:00:00.000Z",
    status: "OPEN",
  },
  {
    defectId: "DEF-003",
    title: "Background/resume instability after extended inactivity",
    severity: "CRITICAL",
    corridor: "MULTI",
    description:
      "App can become unstable after prolonged background period and may require restart before transfer operations recover.",
    screenshots: [],
    reproductionSteps: [
      "Launch app and navigate between transfer screens.",
      "Background app for extended duration.",
      "Resume app and attempt transfer execution.",
      "Observe for instability, stale state, or failed execution continuity.",
    ],
    firstSeen: "2026-05-24T00:00:00.000Z",
    status: "OPEN",
  },
  {
    defectId: "DEF-004",
    title: "Intermittent state synchronization issues",
    severity: "HIGH",
    corridor: "MULTI",
    description:
      "Intermittent synchronization delays occur between Send, History, Track, and operational telemetry views.",
    screenshots: [],
    reproductionSteps: [
      "Execute transfer and move between Send, Track, and Account screens.",
      "Trigger refresh actions and observe state convergence.",
      "Compare status and progress values across screens.",
      "Record mismatches or delayed reconciliation.",
    ],
    firstSeen: "2026-05-24T00:00:00.000Z",
    status: "OPEN",
  },
];

function parseDefectRegister(rawValue: string | null): DefectRecord[] {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is DefectRecord => {
      return (
        typeof item === "object" &&
        item !== null &&
        typeof (item as DefectRecord).defectId === "string" &&
        typeof (item as DefectRecord).title === "string" &&
        typeof (item as DefectRecord).severity === "string" &&
        typeof (item as DefectRecord).corridor === "string" &&
        typeof (item as DefectRecord).description === "string" &&
        Array.isArray((item as DefectRecord).screenshots) &&
        Array.isArray((item as DefectRecord).reproductionSteps) &&
        typeof (item as DefectRecord).firstSeen === "string" &&
        typeof (item as DefectRecord).status === "string"
      );
    });
  } catch {
    return [];
  }
}

function mergeWithInitialDefects(existing: DefectRecord[]): DefectRecord[] {
  const map = new Map(existing.map((defect) => [defect.defectId, defect]));

  for (const seed of INITIAL_DEFECTS) {
    if (!map.has(seed.defectId)) {
      map.set(seed.defectId, seed);
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.defectId.localeCompare(b.defectId)
  );
}

async function saveLocalDefectRegister(defects: DefectRecord[]): Promise<void> {
  await AsyncStorage.setItem(DEFECT_REGISTER_STORAGE_KEY, JSON.stringify(defects));
}

async function syncDefectsToSupabase(defects: DefectRecord[]): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || defects.length === 0) {
      return;
    }

    const payload = defects.map((defect) => ({
      defect_id: defect.defectId,
      user_id: user.id,
      title: defect.title,
      severity: defect.severity,
      corridor: defect.corridor,
      description: defect.description,
      screenshots: defect.screenshots,
      reproduction_steps: defect.reproductionSteps,
      first_seen: defect.firstSeen,
      status: defect.status,
    }));

    const { error } = await supabase.from("qa_defect_register").upsert(payload, {
      onConflict: "defect_id,user_id",
    });

    if (error) {
      console.warn("QA defect register Supabase sync failed", error.message);
    }
  } catch (error) {
    console.warn("QA defect register Supabase sync failed", error);
  }
}

export async function loadDefectRegister(): Promise<DefectRecord[]> {
  const storedValue = await AsyncStorage.getItem(DEFECT_REGISTER_STORAGE_KEY);
  const parsed = parseDefectRegister(storedValue);
  const merged = mergeWithInitialDefects(parsed);

  if (storedValue === null || merged.length !== parsed.length) {
    await saveLocalDefectRegister(merged);
  }

  return merged;
}

export async function upsertDefectRecord(defect: DefectRecord): Promise<DefectRecord[]> {
  const current = await loadDefectRegister();
  const nextMap = new Map(current.map((item) => [item.defectId, item]));
  nextMap.set(defect.defectId, defect);

  const next = Array.from(nextMap.values()).sort((a, b) =>
    a.defectId.localeCompare(b.defectId)
  );

  await saveLocalDefectRegister(next);
  await syncDefectsToSupabase(next);

  return next;
}

export async function updateDefectStatus(
  defectId: string,
  status: DefectStatus
): Promise<DefectRecord[]> {
  const current = await loadDefectRegister();
  const next = current.map((defect) =>
    defect.defectId === defectId ? { ...defect, status } : defect
  );

  await saveLocalDefectRegister(next);
  await syncDefectsToSupabase(next);

  return next;
}

export async function registerDefectObservation(
  input: DefectObservationInput
): Promise<DefectRecord[]> {
  const current = await loadDefectRegister();
  const observationStamp = `[${new Date().toISOString()}] ${input.note}`;

  const next = current.map((defect) => {
    if (defect.defectId !== input.defectId) {
      return defect;
    }

    const nextScreenshots = input.screenshotPath
      ? Array.from(new Set([...defect.screenshots, input.screenshotPath]))
      : defect.screenshots;

    const nextDescription = `${defect.description}\n${observationStamp}`.trim();

    return {
      ...defect,
      corridor: input.corridor || defect.corridor,
      screenshots: nextScreenshots,
      description: nextDescription,
      status: defect.status === "RESOLVED" ? "MONITORING" : defect.status,
    };
  });

  await saveLocalDefectRegister(next);
  await syncDefectsToSupabase(next);

  return next;
}

export async function getOpenDefectCount(): Promise<number> {
  const defects = await loadDefectRegister();
  return defects.filter((defect) => defect.status !== "RESOLVED").length;
}
