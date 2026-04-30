"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { AgentListItem } from "@/features/agents/components/agent-list-item";
import {
  runtimeAccents,
  runtimeIcons,
  runtimeLabels,
} from "@/features/agents/lib/runtime-assets";
import type { Agent } from "@/features/agents/types/agent";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";

const agentColors = [
  "#F5F5F5",
  "#8CB4FF",
  "#EBC05F",
  "#B98EFF",
  "#95E8D7",
  "#FF8E97",
  "#F5944E",
  "#ABFFBF",
];

function getAgentColor(name: string, offset: number) {
  const nameScore = Array.from(name).reduce(
    (score, character) => score + character.charCodeAt(0),
    offset,
  );

  return agentColors[nameScore % agentColors.length];
}

function normalizeIcon(icon: string) {
  return icon.trim().slice(0, 2).toUpperCase();
}

function CreateAgentDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [personality, setPersonality] = useState("");
  const [runtime, setRuntime] = useState<Agent["runtime"]>("claude");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const agentItems = useWorkspaceStore((state) => state.agentItems);
  const addAgent = useWorkspaceStore((state) => state.addAgent);
  const replaceAgent = useWorkspaceStore((state) => state.replaceAgent);
  const updateAgent = useWorkspaceStore((state) => state.updateAgent);

  const trimmedName = name.trim();
  const normalizedIcon = normalizeIcon(icon);
  const trimmedPersonality = personality.trim();
  const isDuplicate = useMemo(
    () =>
      agentItems.some(
        (agent) => agent.name.toLowerCase() === trimmedName.toLowerCase(),
      ),
    [agentItems, trimmedName],
  );

  function resetForm() {
    setName("");
    setIcon("");
    setPersonality("");
    setRuntime("claude");
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      resetForm();
    }
  }

  async function handleCreateAgent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedName || !normalizedIcon || !trimmedPersonality) {
      setError("Name, icon, and personality are required.");
      return;
    }

    if (isDuplicate) {
      setError("An agent with this name already exists.");
      return;
    }

    const temporaryId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `generating-${crypto.randomUUID()}`
        : `generating-${Date.now()}`;
    const color = getAgentColor(trimmedName, agentItems.length);
    const generatingAgent: Agent = {
      id: temporaryId,
      name: trimmedName,
      icon: normalizedIcon,
      personality: "Preparing personality, harness, and local runtime files.",
      runtime,
      memory: "",
      status: "Generating",
      color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addAgent(generatingAgent);
    setOpen(false);
    resetForm();
    setIsCreating(true);

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          icon: normalizedIcon,
          personality: trimmedPersonality,
          runtime,
          color,
          generationId: temporaryId,
        }),
      });
      const payload = (await response.json()) as {
        agent?: Agent;
        error?: string;
        generationId?: string;
      };

      if (!response.ok || !payload.agent) {
        throw new Error(payload.error ?? "Could not create agent.");
      }

      replaceAgent(payload.generationId ?? temporaryId, payload.agent);
    } catch (createError) {
      updateAgent(temporaryId, {
        status: "Failed",
        personality:
          createError instanceof Error
            ? createError.message
            : "Could not create agent.",
      });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="rounded-full border-white/10 bg-white/[0.03] px-3 text-white/84 hover:bg-white/[0.08]"
      >
        <Plus className="h-3.5 w-3.5 text-[var(--accent-strong)]" />
        Add
      </Button>

      <DialogContent className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(8,8,8,0.98))] p-0 text-white shadow-[0_30px_120px_rgba(0,0,0,0.55)] sm:max-w-xl">
        <form onSubmit={handleCreateAgent}>
          <DialogHeader className="border-b border-white/6 p-6">
            <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-white">
              Create agent
            </DialogTitle>
            <DialogDescription className="max-w-md text-sm leading-6 text-white/42">
              Type a short personality brief. The selected local runtime will
              refine it into PERSONALITY.md and the root orchestration skill.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 p-6">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_104px]">
              <label className="grid gap-2 text-sm text-white/62">
                Agent name
                <Input
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError(null);
                  }}
                  placeholder="Navigator"
                  className="h-11 rounded-[18px] border-white/8 bg-black/30 px-4 text-white/84 placeholder:text-white/20"
                />
              </label>

              <label className="grid gap-2 text-sm text-white/62">
                Icon
                <Input
                  value={icon}
                  onChange={(event) => {
                    setIcon(event.target.value);
                    setError(null);
                  }}
                  placeholder="N"
                  maxLength={2}
                  className="h-11 rounded-[18px] border-white/8 bg-black/30 px-4 text-center text-white/84 placeholder:text-white/20"
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm text-white/62">
              Personality brief
              <Textarea
                value={personality}
                onChange={(event) => {
                  setPersonality(event.target.value);
                  setError(null);
                }}
                placeholder="Concise, technical, and careful with local runtime actions."
                className="min-h-40 resize-none rounded-[20px] border-white/8 bg-black/30 p-4 font-mono text-sm leading-6 text-white/84 placeholder:text-white/20"
              />
              <span className="text-xs leading-5 text-white/32">
                This brief is expanded by the local CLI into a concise
                PERSONALITY.md file and the orchestrator SKILL.md.
              </span>
            </label>

            <div className="grid gap-2 text-sm text-white/62">
              Runtime
              <div className="grid grid-cols-2 gap-2">
                {(["claude", "codex"] as const).map((runtimeOption) => (
                  <Button
                    key={runtimeOption}
                    type="button"
                    variant="outline"
                    onClick={() => setRuntime(runtimeOption)}
                    className={cn(
                      "h-12 justify-start gap-3 rounded-[16px] border-white/8 bg-black/30 px-3 text-white/62 transition-all hover:bg-white/[0.06] hover:text-white",
                      runtime === runtimeOption &&
                        "border-[rgba(245,148,78,0.72)] bg-[linear-gradient(180deg,rgba(245,148,78,0.26),rgba(245,148,78,0.11))] text-white shadow-[0_18px_46px_rgba(245,148,78,0.16),inset_0_1px_0_rgba(255,226,205,0.18)]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-white/10 bg-white/[0.04] p-1",
                        runtime === runtimeOption &&
                          "border-[rgba(245,148,78,0.58)] bg-[rgba(245,148,78,0.18)]",
                      )}
                      style={{ color: runtimeAccents[runtimeOption] }}
                    >
                      <img
                        src={runtimeIcons[runtimeOption]}
                        alt={`${runtimeLabels[runtimeOption]} icon`}
                        className="h-full w-full rounded-[7px] object-contain"
                      />
                    </span>
                    <span>{runtimeLabels[runtimeOption]}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-[20px] border border-white/8 bg-white/[0.025] p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/28">
                Preview
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-white/8 bg-white/[0.04] text-sm font-semibold"
                  style={{ color: getAgentColor(trimmedName || "agent", agentItems.length) }}
                >
                  {normalizedIcon || "A"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {trimmedName || "New agent"}
                  </p>
                  <p className="truncate text-xs text-white/42">
                    {trimmedPersonality
                      ? `Brief: ${trimmedPersonality.split("\n")[0]}`
                      : "Local CLI will generate personality and orchestration"}
                  </p>
                </div>
              </div>
            </div>

            {error ? <p className="text-sm text-[#ff8e97]">{error}</p> : null}
          </div>

          <DialogFooter className="mx-0 mb-0 border-white/8 bg-white/[0.025]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-full border-white/10 bg-transparent px-4 text-white/64 hover:bg-white/[0.06] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating}
              className="rounded-full border border-[rgba(196,112,52,0.56)] bg-[linear-gradient(180deg,#5c3118,#4b2612)] px-4 text-[#f8ede6] hover:bg-[linear-gradient(180deg,#6a391d,#572c16)]"
            >
              <Plus className="h-3.5 w-3.5" />
              {isCreating ? "Generating..." : "Create agent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AgentListPanel() {
  const isAgentPanelCollapsed = useWorkspaceStore(
    (state) => state.isAgentPanelCollapsed,
  );
  const agentItems = useWorkspaceStore((state) => state.agentItems);
  const selectedAgentId = useWorkspaceStore((state) => state.selectedAgentId);
  const agentSearchQuery = useWorkspaceStore((state) => state.agentSearchQuery);
  const setAgentItems = useWorkspaceStore((state) => state.setAgentItems);
  const setAgentSearchQuery = useWorkspaceStore(
    (state) => state.setAgentSearchQuery,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadAgents() {
      const response = await fetch("/api/agents", { cache: "no-store" });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { agents?: Agent[] };

      if (!cancelled && payload.agents) {
        setAgentItems(payload.agents);
      }
    }

    void loadAgents();

    return () => {
      cancelled = true;
    };
  }, [setAgentItems]);

  useEffect(() => {
    if (!agentItems.some((agent) => agent.status === "Generating")) {
      return;
    }

    let cancelled = false;
    const interval = window.setInterval(() => {
      async function loadAgents() {
        const response = await fetch("/api/agents", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { agents?: Agent[] };

        if (!cancelled && payload.agents) {
          setAgentItems(payload.agents);
        }
      }

      void loadAgents();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [agentItems, setAgentItems]);

  const visibleAgents = agentItems.filter((agent) =>
    agent.name.toLowerCase().includes(agentSearchQuery.toLowerCase()),
  );

  return (
    <section
      className={cn(
        "border-b border-white/6 bg-[rgba(7,7,7,0.88)] transition-all duration-300 lg:border-b-0 lg:border-r",
        isAgentPanelCollapsed && "hidden lg:hidden",
      )}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-white/6 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium tracking-[0.02em] text-white/52">
                Harness Agent Canvas
              </p>
            </div>
            <CreateAgentDialog />
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />
            <Input
              value={agentSearchQuery}
              onChange={(event) => setAgentSearchQuery(event.target.value)}
              placeholder="Search agents"
              className="h-11 rounded-full border-white/8 bg-white/[0.03] pl-9 text-white placeholder:text-white/24"
            />
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1 px-2 py-2">
          {agentItems.length === 0 ? (
            <div className="px-2 py-5">
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.025] p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-[rgba(245,148,78,0.22)] bg-[rgba(245,148,78,0.08)] text-[var(--accent-strong)]">
                  <Bot className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold tracking-[-0.04em] text-white">
                  No agents yet
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/42">
                  Create an agent to choose Claude or Codex and start local
                  CLI-backed chat.
                </p>
              </div>
            </div>
          ) : visibleAgents.length === 0 ? (
            <div className="px-4 py-5 text-sm text-white/38">
              No agents match this search.
            </div>
          ) : (
            <div className="space-y-1.5 pr-1">
              {visibleAgents.map((agent) => (
                <AgentListItem
                  key={agent.id}
                  agent={agent}
                  active={agent.id === selectedAgentId}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </section>
  );
}
