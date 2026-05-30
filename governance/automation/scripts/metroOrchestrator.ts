import { ChildProcess, spawn } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import http from "node:http";
import path from "node:path";

type MetroSession = {
  url: string;
  wasAlreadyRunning: boolean;
  logPath: string;
  stop: () => Promise<void>;
};

const METRO_URL = "http://127.0.0.1:8081/status";

function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkMetroStatus(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      let body = "";

      response.on("data", (chunk) => {
        body += chunk.toString();
      });

      response.on("end", () => {
        resolve(response.statusCode === 200 && body.includes("packager-status:running"));
      });
    });

    request.on("error", () => {
      resolve(false);
    });

    request.setTimeout(3000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function terminateProcessTree(child: ChildProcess): void {
  if (!child.pid) return;

  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      shell: true,
      stdio: "ignore",
    });

    killer.on("error", () => {
      child.kill("SIGKILL");
    });

    return;
  }

  child.kill("SIGKILL");
}

export async function ensureMetroRunning(repoRoot: string, outputRoot: string): Promise<MetroSession> {
  const alreadyRunning = await checkMetroStatus(METRO_URL);
  const logDir = path.join(outputRoot, "logs");
  const logPath = path.join(logDir, "metro.log");
  mkdirSync(logDir, { recursive: true });

  if (alreadyRunning) {
    appendFileSync(logPath, `[${new Date().toISOString()}] Metro already running at ${METRO_URL}\n`);
    return {
      url: METRO_URL,
      wasAlreadyRunning: true,
      logPath,
      stop: async () => {
        // Intentionally no-op when this process did not launch Metro.
      },
    };
  }

  const child = spawn(
    "npx",
    ["expo", "start", "--dev-client", "--non-interactive", "--localhost", "--port", "8081"],
    {
      cwd: repoRoot,
      shell: true,
      env: {
        ...process.env,
        EXPO_NO_TELEMETRY: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  child.stdout?.on("data", (chunk) => {
    appendFileSync(logPath, chunk.toString());
  });

  child.stderr?.on("data", (chunk) => {
    appendFileSync(logPath, chunk.toString());
  });

  let ready = false;
  for (let attempt = 1; attempt <= 45; attempt += 1) {
    ready = await checkMetroStatus(METRO_URL);
    if (ready) break;
    await waitFor(2000);
  }

  if (!ready) {
    terminateProcessTree(child);
    throw new Error("Metro failed to reach ready state at http://127.0.0.1:8081/status within 90 seconds.");
  }

  appendFileSync(logPath, `[${new Date().toISOString()}] Metro ready at ${METRO_URL}\n`);

  return {
    url: METRO_URL,
    wasAlreadyRunning: false,
    logPath,
    stop: async () => {
      terminateProcessTree(child);
    },
  };
}
