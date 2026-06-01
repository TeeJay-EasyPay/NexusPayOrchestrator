import { mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

import { runCommand } from "./commandUtils";

const DEFAULT_DEV_CLIENT_URL =
  "exp+nexuspayorchestrator://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081";

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

  try {
    const child = spawn(
      "emulator",
      ["-avd", avdName, "-netdelay", "none", "-netspeed", "full"],
      {
        detached: true,
        shell: process.platform === "win32",
        stdio: "ignore",
        windowsHide: true,
      }
    );

    child.unref();
    notes.push(`Emulator startup command issued for AVD ${avdName}.`);
  } catch (error) {
    notes.push(
      `Emulator startup failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
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

export async function prepareDeviceForStartupLaunch(
  deviceId: string,
  notes?: string[]
): Promise<void> {
  const commands: { args: string[]; successNote: string; failureNote: string }[] = [
    {
      args: ["-s", deviceId, "shell", "input", "keyevent", "KEYCODE_WAKEUP"],
      successNote: "Device wake command issued.",
      failureNote: "Device wake command warning",
    },
    {
      args: ["-s", deviceId, "shell", "wm", "dismiss-keyguard"],
      successNote: "Device keyguard dismiss command issued.",
      failureNote: "Device keyguard dismiss warning",
    },
    {
      args: ["-s", deviceId, "shell", "settings", "put", "global", "stay_on_while_plugged_in", "3"],
      successNote: "Device stay-awake setting applied for validation.",
      failureNote: "Device stay-awake setting warning",
    },
  ];

  for (const command of commands) {
    const result = await runCommand("adb", command.args, {
      allowFailure: true,
      timeoutMs: 15000,
    });

    if (!notes) continue;

    notes.push(
      result.code === 0
        ? command.successNote
        : `${command.failureNote}: ${result.stderr || result.stdout}`
    );
  }
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
    await prepareDeviceForStartupLaunch(deviceId, notes);

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
      DEFAULT_DEV_CLIENT_URL;

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
