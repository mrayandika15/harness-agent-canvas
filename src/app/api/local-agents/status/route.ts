import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

type LocalRuntimeKey = "claude" | "codex";

type LocalRuntimeStatus = {
  key: LocalRuntimeKey;
  label: string;
  command: string;
  installed: boolean;
  running: boolean;
  path: string | null;
  process: string | null;
};

const runtimes = [
  { key: "claude", label: "Claude", command: "claude" },
  { key: "codex", label: "Codex", command: "codex" },
] satisfies Array<{
  key: LocalRuntimeKey;
  label: string;
  command: string;
}>;

async function runShell(command: string) {
  try {
    const { stdout } = await execFileAsync("/bin/zsh", ["-lc", command], {
      timeout: 2500,
    });

    return stdout.trim();
  } catch {
    return "";
  }
}

async function getRuntimeStatus(
  runtime: (typeof runtimes)[number],
): Promise<LocalRuntimeStatus> {
  const [path, processList] = await Promise.all([
    runShell(`command -v ${runtime.command}`),
    runShell("ps -axo pid=,command="),
  ]);
  const process =
    processList
      .split("\n")
      .map((line) => line.trim())
      .filter(
        (line) =>
          line.toLowerCase().includes(runtime.command) &&
          !line.includes("/bin/zsh -lc") &&
          !line.includes("chrome_crashpad_handler") &&
          !line.includes("ps -axo"),
      )
      .find(Boolean) ?? null;

  return {
    ...runtime,
    installed: Boolean(path),
    running: Boolean(process),
    path: path || null,
    process,
  };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const results = await Promise.all(runtimes.map(getRuntimeStatus));

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    runtimes: results,
  });
}
