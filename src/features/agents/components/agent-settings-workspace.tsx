"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Command,
  Cpu,
  HardDrive,
  Loader2,
  BrainCircuit,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { PanelCard } from "@/components/app/panel-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  runtimeAccents,
  runtimeIcons,
} from "@/features/agents/lib/runtime-assets";
import { cn } from "@/lib/utils";

type RuntimeKey = "claude" | "codex";

type RuntimeStatus = {
  key: RuntimeKey;
  label: string;
  command: string;
  installed: boolean;
  running: boolean;
  path: string | null;
  process: string | null;
};

type StatusResponse = {
  checkedAt: string;
  runtimes: RuntimeStatus[];
};

type ClaudeMemStatus = {
  enabled: boolean;
  url: string;
  project: string;
  error?: string;
};

const fallbackRuntimes: RuntimeStatus[] = [
  {
    key: "claude",
    label: "Claude",
    command: "claude",
    installed: false,
    running: false,
    path: null,
    process: null,
  },
  {
    key: "codex",
    label: "Codex",
    command: "codex",
    installed: false,
    running: false,
    path: null,
    process: null,
  },
];

function formatCheckTime(checkedAt: string | null) {
  if (!checkedAt) {
    return "Not checked yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(checkedAt));
}

type RuntimeDetailRowProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
};

function RuntimeDetailRow({ icon: Icon, label, value }: RuntimeDetailRowProps) {
  return (
    <div className="grid min-h-12 grid-cols-[104px_minmax(0,1fr)] items-center gap-3 border-t border-white/6 px-4 first:border-t-0">
      <span className="flex min-w-0 items-center gap-2 text-sm text-white/42">
        <Icon className="h-4 w-4 shrink-0 text-white/24" />
        <span className="truncate">{label}</span>
      </span>
      <code
        title={value}
        className="min-w-0 truncate text-right text-sm text-white/76"
      >
        {value}
      </code>
    </div>
  );
}

export function AgentSettingsWorkspace() {
  const [localOnly, setLocalOnly] = useState(true);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [memoryStatus, setMemoryStatus] = useState<ClaudeMemStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runtimes = status?.runtimes ?? fallbackRuntimes;
  const readyCount = useMemo(
    () => runtimes.filter((runtime) => runtime.installed && runtime.running).length,
    [runtimes],
  );
  const allReady = readyCount === runtimes.length;
  const memoryReady = Boolean(memoryStatus?.enabled);

  const refreshStatus = useCallback(async () => {
    setIsChecking(true);
    setError(null);

    try {
      const [runtimeResponse, memoryResponse] = await Promise.all([
        fetch("/api/local-agents/status", { cache: "no-store" }),
        fetch("/api/claude-mem/status", { cache: "no-store" }),
      ]);

      if (!runtimeResponse.ok) {
        throw new Error("Local runtime check failed");
      }

      setStatus((await runtimeResponse.json()) as StatusResponse);
      setMemoryStatus(
        memoryResponse.ok
          ? ((await memoryResponse.json()) as ClaudeMemStatus)
          : {
              enabled: false,
              url: "http://localhost:37777",
              project: "harness-agent-canvas",
              error: "Claude-Mem check failed",
            },
      );
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Local runtime check failed",
      );
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[rgba(5,5,5,0.82)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-6">
        <div className="grid gap-4 border-b border-white/6 pb-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/28">
              Local Runtime Settings
            </p>
            <h2 className="mt-2 text-[clamp(1.65rem,3vw,2.4rem)] font-semibold leading-tight tracking-[-0.04em] text-white">
              Keep Claude and Codex on this machine
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/42">
              Verify the local CLIs are installed and active before routing agent
              work. The check runs against this Next.js host only.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Badge
              className={cn(
                "rounded-full px-3",
                allReady
                  ? "bg-[rgba(134,216,155,0.14)] text-[#abffbf]"
                  : "bg-[rgba(245,192,94,0.12)] text-[#ebc05f]",
              )}
            >
              {allReady ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <CircleAlert className="h-3.5 w-3.5" />
              )}
              {readyCount}/{runtimes.length} ready
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void refreshStatus()}
              disabled={isChecking}
              className="h-8 rounded-full border-white/10 bg-white/[0.03] px-3 text-white/72 hover:bg-white/[0.08] hover:text-white"
            >
              {isChecking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Check
            </Button>
          </div>
        </div>

        <PanelCard className="overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="p-5">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-[rgba(149,232,215,0.2)] bg-[rgba(149,232,215,0.08)] text-[#95e8d7]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Local-only execution
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-white/42">
                      Keep orchestration pointed at processes on localhost. If a
                      runtime is missing or asleep, this screen makes that obvious
                      before work is dispatched.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setLocalOnly((current) => !current)}
                  className={cn(
                    "h-9 rounded-full border-white/10 px-3 text-white/78 hover:bg-white/[0.08] sm:justify-self-end",
                    localOnly && "bg-white/[0.08] text-white",
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      localOnly ? "bg-[#abffbf]" : "bg-white/24",
                    )}
                  />
                  {localOnly ? "Local only" : "Allow fallback"}
                </Button>
              </div>
            </div>

            <div className="border-t border-white/6 bg-white/[0.025] p-5 lg:border-l lg:border-t-0">
              <div className="flex items-center gap-3 text-sm text-white/58">
                <HardDrive className="h-4 w-4 text-white/32" />
                Last checked
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                {formatCheckTime(status?.checkedAt ?? null)}
              </p>
              {error ? (
                <p className="mt-2 text-sm text-[#ff8e97]">{error}</p>
              ) : (
                <p className="mt-2 text-sm text-white/36">
                  Refresh after starting either CLI in a local terminal.
                </p>
              )}
            </div>
          </div>
        </PanelCard>

        <PanelCard className="overflow-hidden p-0">
          <div
            className="h-1"
            style={{
              backgroundColor: memoryReady ? "#95E8D7" : "rgba(255,255,255,0.08)",
            }}
          />
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="p-5">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border",
                      memoryReady
                        ? "border-[rgba(149,232,215,0.22)] bg-[rgba(149,232,215,0.1)] text-[#95e8d7]"
                        : "border-white/10 bg-white/[0.04] text-white/38",
                    )}
                  >
                    <BrainCircuit className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Claude-Mem project memory
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-white/42">
                      Inject relevant project memory into agent prompts from the
                      local Claude-Mem worker. Durable agent memory is managed
                      by Claude-Mem, not the app store.
                    </p>
                  </div>
                </div>

                <Badge
                  className={cn(
                    "rounded-full px-3 sm:justify-self-end",
                    memoryReady
                      ? "bg-[rgba(149,232,215,0.12)] text-[#b8fff1]"
                      : "bg-white/[0.04] text-white/52",
                  )}
                >
                  {memoryReady ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <CircleAlert className="h-3.5 w-3.5" />
                  )}
                  {memoryReady ? "Running" : "Not running"}
                </Badge>
              </div>
            </div>

            <div className="border-t border-white/6 bg-white/[0.025] lg:border-l lg:border-t-0">
              <RuntimeDetailRow
                icon={HardDrive}
                label="Worker"
                value={memoryStatus?.url ?? "Checking local worker"}
              />
              <RuntimeDetailRow
                icon={Command}
                label="Project"
                value={memoryStatus?.project ?? "harness-agent-canvas"}
              />
              <RuntimeDetailRow
                icon={Cpu}
                label="Status"
                value={
                  memoryReady
                    ? "Ready for agent memory"
                    : memoryStatus?.error ?? "Worker not detected"
                }
              />
            </div>
          </div>
        </PanelCard>

        <div className="grid gap-4 xl:grid-cols-2">
          {runtimes.map((runtime) => {
            const ready = runtime.installed && runtime.running;
            const accent = runtimeAccents[runtime.key];
            const iconSrc = runtimeIcons[runtime.key];

            return (
              <PanelCard key={runtime.key} className="overflow-hidden p-0">
                <div
                  className="h-1"
                  style={{
                    backgroundColor: ready ? accent : "rgba(255,255,255,0.08)",
                  }}
                />
                <div className="flex flex-col gap-5 p-5">
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[16px] border border-white/10 bg-white/[0.04] p-1.5"
                        style={{ color: accent }}
                      >
                        <img
                          src={iconSrc}
                          alt={`${runtime.label} icon`}
                          className="h-full w-full rounded-[10px] object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-white">
                          {runtime.label}
                        </h3>
                        <p className="mt-1 truncate text-sm text-white/38">
                          {ready
                            ? "Installed and running locally"
                            : runtime.installed
                              ? "Installed, no active process found"
                              : "CLI not found on this host"}
                        </p>
                      </div>
                    </div>

                    <Badge
                      className={cn(
                        "rounded-full px-3 sm:justify-self-end",
                        ready
                          ? "bg-[rgba(134,216,155,0.14)] text-[#abffbf]"
                          : "bg-white/[0.04] text-white/52",
                      )}
                    >
                      {ready ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <CircleAlert className="h-3.5 w-3.5" />
                      )}
                      {ready ? "Ready" : "Needs attention"}
                    </Badge>
                  </div>

                  <div className="overflow-hidden rounded-[22px] border border-white/8 bg-black/30">
                    <RuntimeDetailRow
                      icon={Command}
                      label="Command"
                      value={runtime.command}
                    />
                    <RuntimeDetailRow
                      icon={HardDrive}
                      label="Binary"
                      value={runtime.path ?? "Not found in PATH"}
                    />
                    <RuntimeDetailRow
                      icon={Cpu}
                      label="Process"
                      value={runtime.process ?? "No local process detected"}
                    />
                  </div>
                </div>
              </PanelCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
