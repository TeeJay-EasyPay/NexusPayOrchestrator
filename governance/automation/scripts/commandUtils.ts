import { spawn } from "node:child_process";
import { execSync } from "node:child_process";

export type CommandResult = {
  command: string;
  args: string[];
  code: number;
  stdout: string;
  stderr: string;
  durationMs: number;
};

export async function runCommand(
  command: string,
  args: string[],
  options?: {
    cwd?: string;
    env?: Record<string, string | undefined>;
    timeoutMs?: number;
    allowFailure?: boolean;
  }
): Promise<CommandResult> {
  const started = Date.now();

  return new Promise<CommandResult>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options?.cwd,
      env: {
        ...process.env,
        ...(options?.env ?? {}),
      },
      shell: process.platform === "win32",
    });

    let stdout = "";
    let stderr = "";
    let timer: NodeJS.Timeout | null = null;
    let timedOut = false;

    const terminateProcessTree = (): void => {
      if (process.platform === "win32") {
        try {
          execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: "ignore" });
          return;
        } catch {
          // Fall through to regular kill if taskkill fails.
        }
      }

      child.kill("SIGKILL");
    };

    if (options?.timeoutMs && options.timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        terminateProcessTree();
      }, options.timeoutMs);
    }

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (timer) clearTimeout(timer);

      if (options?.allowFailure) {
        resolve({
          command,
          args,
          code: 1,
          stdout,
          stderr: `${stderr}\n${error.message}`.trim(),
          durationMs: Date.now() - started,
        });
        return;
      }

      reject(error);
    });

    child.on("close", (code) => {
      if (timer) clearTimeout(timer);

      const result: CommandResult = {
        command,
        args,
        code: timedOut ? 124 : (code ?? 1),
        stdout,
        stderr: timedOut
          ? `${stderr}\nCommand timed out after ${options?.timeoutMs}ms.`.trim()
          : stderr,
        durationMs: Date.now() - started,
      };

      if (result.code !== 0 && !options?.allowFailure) {
        reject(
          new Error(
            `Command failed: ${command} ${args.join(" ")}\n${result.stderr || result.stdout}`
          )
        );
        return;
      }

      resolve(result);
    });
  });
}
