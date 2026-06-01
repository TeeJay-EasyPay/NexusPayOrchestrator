import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { runCommand } from "./commandUtils";

export type EmulatorBaselineResult = {
  ready: boolean;
  deviceId: string | null;
  packageLaunched: boolean;
  notes: string[];
  artifacts: {
    baselineLogPath: string;
  };
};

function parseDeviceId(adbDevicesOutput: string): string | null {
  const lines = adbDevicesOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("List of devices"));

  const active = lines.find((line) => line.endsWith("\tdevice"));
  if (!active) return null;

  return active.split("\t")[0] ?? null;
}

async function tryStartEmulator(notes: string[]): Promise<void> {
  const avdName = process.env.ANDROID_AVD_NAME;

  if (!avdName) {
    notes.push("ANDROID_AVD_NAME not set. Skipping automatic emulator startup.");
    return;
  }

  const result = await runCommand(
    "emulator",
    ["-avd", avdName, "-netdelay", "none", "-netspeed", "full"],
    { allowFailure: true }
  );

  if (result.code === 0) {
    notes.push(`Emulator startup command issued for AVD ${avdName}.`);
    return;
  }

  notes.push(`Emulator startup failed: ${result.stderr || result.stdout}`);
}

async function waitForDevice(maxAttempts: number, delayMs: number): Promise<string | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const devices = await runCommand("adb", ["devices"], {
      allowFailure: true,
      timeoutMs: 15000,
    });
    const deviceId = parseDeviceId(devices.stdout);

    if (deviceId) {
      return deviceId;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return null;
}

export async function runEmulatorBaseline(
  repoRoot: string,
  runDirectory: string
): Promise<EmulatorBaselineResult> {
  const notes: string[] = [];
  mkdirSync(runDirectory, { recursive: true });

  const adbVersion = await runCommand("adb", ["version"], {
    allowFailure: true,
    timeoutMs: 15000,
  });
  if (adbVersion.code !== 0) {
    notes.push("ADB is not available. Install Android platform tools before running pilot certification.");
  }

  const initialDevices = await runCommand("adb", ["devices"], {
    allowFailure: true,
    timeoutMs: 15000,
  });
  let deviceId = parseDeviceId(initialDevices.stdout);

  if (!deviceId) {
    notes.push("No active emulator detected at baseline start.");
    await tryStartEmulator(notes);
    deviceId = await waitForDevice(12, 5000);
  }

  let packageLaunched = false;
  if (deviceId) {
    const reverse = await runCommand("adb", ["-s", deviceId, "reverse", "tcp:8081", "tcp:8081"], {
      allowFailure: true,
      timeoutMs: 15000,
    });

    if (reverse.code === 0) {
      notes.push("ADB reverse tcp:8081->tcp:8081 configured.");
    } else {
      notes.push(`ADB reverse warning: ${reverse.stderr || reverse.stdout}`);
    }

    const devClientUrl =
      process.env.EXPO_DEV_CLIENT_URL ??
      "exp+nexuspayorchestrator://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081";

    const deepLinkLaunch = await runCommand(
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
        devClientUrl,
        "com.nexuspay.orchestrator",
      ],
      {
        allowFailure: true,
        timeoutMs: 45000,
      }
    );

    if (deepLinkLaunch.code === 0) {
      packageLaunched = true;
      notes.push("Dev-client deep link launch command succeeded for com.nexuspay.orchestrator.");
    }

    const launch = await runCommand(
      "adb",
      ["-s", deviceId, "shell", "monkey", "-p", "com.nexuspay.orchestrator", "-c", "android.intent.category.LAUNCHER", "1"],
      {
        allowFailure: true,
        timeoutMs: 45000,
      }
    );

    packageLaunched = packageLaunched || launch.code === 0;
    notes.push(
      packageLaunched
        ? "Application launch command succeeded for com.nexuspay.orchestrator."
        : `Application launch command failed: ${launch.stderr || launch.stdout}`
    );
  } else {
    notes.push("No emulator device became ready after startup attempts.");
  }

  const baselineLogPath = path.join(runDirectory, "emulator-baseline.json");
  writeFileSync(
    baselineLogPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        repoRoot,
        deviceId,
        packageLaunched,
        notes,
      },
      null,
      2
    )
  );

  return {
    ready: Boolean(deviceId),
    deviceId,
    packageLaunched,
    notes,
    artifacts: {
      baselineLogPath,
    },
  };
}
