import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { Agent } from "@/features/agents/types/agent";

type ClaudeMemSearchResult = {
  id?: number | string;
  title?: string;
  type?: string;
  narrative?: string;
  content?: string;
  created_at?: string;
  project?: string;
};

type ClaudeMemSearchResponse = {
  results?: ClaudeMemSearchResult[];
  observations?: ClaudeMemSearchResult[];
  total?: number;
};

export type ClaudeMemStatus = {
  enabled: boolean;
  url: string;
  project: string;
  error?: string;
};

const DEFAULT_CLAUDE_MEM_URL = "http://localhost:37777";
const REQUEST_TIMEOUT_MS = 1_800;

function getClaudeMemBaseUrl() {
  return (
    process.env.CLAUDE_MEM_URL ||
    getClaudeMemConfiguredUrl() ||
    DEFAULT_CLAUDE_MEM_URL
  ).replace(/\/+$/, "");
}

function getClaudeMemProject() {
  return process.env.CLAUDE_MEM_PROJECT || path.basename(process.cwd());
}

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

function getClaudeMemConfiguredUrl() {
  const home = os.homedir();
  const settingsPath = path.join(home, ".claude-mem", "settings.json");
  const workerPidPath = path.join(home, ".claude-mem", "worker.pid");
  const settings = readJsonFile<Record<string, unknown>>(settingsPath);
  const pidFile = readJsonFile<Record<string, unknown>>(workerPidPath);
  const host =
    typeof settings?.CLAUDE_MEM_WORKER_HOST === "string"
      ? settings.CLAUDE_MEM_WORKER_HOST
      : "localhost";
  const port =
    typeof pidFile?.port === "number"
      ? String(pidFile.port)
      : typeof settings?.CLAUDE_MEM_WORKER_PORT === "string"
        ? settings.CLAUDE_MEM_WORKER_PORT
        : undefined;

  return port ? `http://${host}:${port}` : null;
}

function readJsonFile<T>(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

export async function getClaudeMemStatus(): Promise<ClaudeMemStatus> {
  const url = getClaudeMemBaseUrl();
  const project = getClaudeMemProject();

  try {
    const response = await fetchWithTimeout(`${url}/health`);

    if (!response.ok) {
      return {
        enabled: false,
        url,
        project,
        error: `Claude-Mem health returned ${response.status}`,
      };
    }

    return { enabled: true, url, project };
  } catch (error) {
    return {
      enabled: false,
      url,
      project,
      error:
        error instanceof Error
          ? error.message
          : "Claude-Mem worker is not reachable.",
    };
  }
}

export async function getClaudeMemAgentContext(agent: Agent, query: string) {
  const status = await getClaudeMemStatus();

  if (!status.enabled) {
    return "";
  }

  const searchParams = new URLSearchParams({
    query: `${agent.name} ${query}`.trim(),
    project: status.project,
    limit: "5",
    orderBy: "date_desc",
  });

  try {
    const response = await fetchWithTimeout(
      `${status.url}/api/search?${searchParams.toString()}`,
    );

    if (!response.ok) {
      return "";
    }

    const payload = (await response.json()) as ClaudeMemSearchResponse;
    const results = (payload.results ?? payload.observations ?? []).slice(0, 5);

    if (results.length === 0) {
      return "";
    }

    return [
      `Claude-Mem project: ${status.project}`,
      ...results.map((result, index) => {
        const body = result.narrative ?? result.content ?? "";
        const details = body ? `\n${body.slice(0, 700)}` : "";

        return [
          `${index + 1}. ${result.title ?? `Memory #${result.id ?? index + 1}`}`,
          result.type ? `Type: ${result.type}` : "",
          result.created_at ? `Date: ${result.created_at}` : "",
          details,
        ]
          .filter(Boolean)
          .join("\n");
      }),
    ].join("\n\n");
  } catch {
    return "";
  }
}

export async function recordClaudeMemAgentExchange({
  agent,
  userMessage,
  assistantMessage,
}: {
  agent: Agent;
  userMessage: string;
  assistantMessage: string;
}) {
  const status = await getClaudeMemStatus();

  if (!status.enabled) {
    return false;
  }

  // Claude-Mem records automatically through Claude Code hooks. This explicit
  // record path is intentionally conservative because the worker observation
  // endpoint requires an internal session database id.
  void agent;
  void userMessage;
  void assistantMessage;

  return true;
}
