"use client";

import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  Bot,
  Check,
  Hash,
  MessageCircle,
  RadioTower,
  Send,
  Settings2,
} from "lucide-react";

import { PanelCard } from "@/components/app/panel-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";
import { cn } from "@/lib/utils";

type IntegrationKey = "discord" | "telegram";

type IntegrationConfig = {
  enabled: boolean;
  endpoint: string;
  target: string;
  notes: string;
};

type AgentIntegrationSettings = Record<IntegrationKey, IntegrationConfig>;

const defaultIntegrationSettings: AgentIntegrationSettings = {
  discord: {
    enabled: false,
    endpoint: "",
    target: "",
    notes: "",
  },
  telegram: {
    enabled: false,
    endpoint: "",
    target: "",
    notes: "",
  },
};

const integrationMeta = {
  discord: {
    title: "Discord",
    icon: MessageCircle,
    accent: "rgba(140,180,255,0.9)",
    endpointLabel: "Webhook URL",
    endpointPlaceholder: "https://discord.com/api/webhooks/...",
    targetLabel: "Channel",
    targetPlaceholder: "#agent-alerts",
  },
  telegram: {
    title: "Telegram",
    icon: Send,
    accent: "rgba(149,232,215,0.9)",
    endpointLabel: "Bot Token",
    endpointPlaceholder: "123456:ABC-DEF...",
    targetLabel: "Chat ID",
    targetPlaceholder: "-1001234567890",
  },
} satisfies Record<
  IntegrationKey,
  {
    title: string;
    icon: ComponentType<{ className?: string }>;
    accent: string;
    endpointLabel: string;
    endpointPlaceholder: string;
    targetLabel: string;
    targetPlaceholder: string;
  }
>;

function createInitialSettings(agentNames: string[]) {
  return Object.fromEntries(
    agentNames.map((agentName) => [
      agentName,
      {
        discord: { ...defaultIntegrationSettings.discord },
        telegram: { ...defaultIntegrationSettings.telegram },
      },
    ]),
  ) as Record<string, AgentIntegrationSettings>;
}

export function AgentIntegrationsWorkspace() {
  const agentItems = useWorkspaceStore((state) => state.agentItems);
  const selectedAgentId = useWorkspaceStore((state) => state.selectedAgentId);
  const selectedAgent =
    agentItems.find((agent) => agent.id === selectedAgentId) ?? agentItems[0];
  const [settingsByAgent, setSettingsByAgent] = useState(() =>
    createInitialSettings(agentItems.map((agent) => agent.name)),
  );
  const selectedAgentName = selectedAgent?.name ?? "";

  const agentSettings = useMemo(
    () =>
      settingsByAgent[selectedAgentName] ?? {
        discord: { ...defaultIntegrationSettings.discord },
        telegram: { ...defaultIntegrationSettings.telegram },
      },
    [selectedAgentName, settingsByAgent],
  );

  if (!selectedAgent) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto bg-[rgba(5,5,5,0.82)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-6">
          <PanelCard className="p-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/28">
              Agent Integrations
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
              No agent selected
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/42">
              Create an agent first, then connect it to Discord or Telegram.
            </p>
          </PanelCard>
        </div>
      </div>
    );
  }

  function updateIntegration(
    integration: IntegrationKey,
    patch: Partial<IntegrationConfig>,
  ) {
    setSettingsByAgent((current) => {
      const currentAgentSettings = current[selectedAgent.name] ?? {
        discord: { ...defaultIntegrationSettings.discord },
        telegram: { ...defaultIntegrationSettings.telegram },
      };

      return {
        ...current,
        [selectedAgent.name]: {
          ...currentAgentSettings,
          [integration]: {
            ...currentAgentSettings[integration],
            ...patch,
          },
        },
      };
    });
  }

  const connectedCount = (Object.keys(agentSettings) as IntegrationKey[]).filter(
    (key) => agentSettings[key].enabled,
  ).length;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[rgba(5,5,5,0.82)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-6">
        <div className="flex flex-col gap-4 border-b border-white/6 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/28">
              Agent Integrations
            </p>
            <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.04em] text-white">
              {selectedAgent.name} notification channels
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/42">
              Connect this agent to Discord or Telegram so it can send alerts,
              handoff notes, and completion updates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-white/[0.04] px-3 text-white/58">
              <RadioTower className="h-3.5 w-3.5" />
              {connectedCount} active
            </Badge>
            <Badge
              className="rounded-full px-3 text-black"
              style={{ backgroundColor: selectedAgent.color }}
            >
              <Bot className="h-3.5 w-3.5" />
              {selectedAgent.status}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {(Object.keys(integrationMeta) as IntegrationKey[]).map(
            (integration) => {
              const meta = integrationMeta[integration];
              const Icon = meta.icon;
              const config = agentSettings[integration];

              return (
                <PanelCard key={integration} className="overflow-hidden p-0">
                  <div
                    className="h-1"
                    style={{
                      backgroundColor: config.enabled
                        ? meta.accent
                        : "rgba(255,255,255,0.08)",
                    }}
                  />
                  <div className="flex flex-col gap-5 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.04]"
                          style={{ color: meta.accent }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {meta.title}
                          </h3>
                          <p className="mt-1 text-sm text-white/38">
                            {config.enabled
                              ? "Ready to send notifications"
                              : "Disconnected"}
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateIntegration(integration, {
                            enabled: !config.enabled,
                          })
                        }
                        className={cn(
                          "h-9 rounded-full border-white/10 px-3 text-white/78",
                          config.enabled && "bg-white/[0.08] text-white",
                        )}
                      >
                        {config.enabled ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Settings2 className="h-4 w-4" />
                        )}
                        {config.enabled ? "Enabled" : "Enable"}
                      </Button>
                    </div>

                    <div className="grid gap-4">
                      <label className="grid gap-2 text-sm text-white/62">
                        {meta.endpointLabel}
                        <Input
                          value={config.endpoint}
                          onChange={(event) =>
                            updateIntegration(integration, {
                              endpoint: event.target.value,
                            })
                          }
                          placeholder={meta.endpointPlaceholder}
                          className="h-11 rounded-[18px] border-white/8 bg-black/30 px-4 text-white/78 placeholder:text-white/20"
                        />
                      </label>

                      <label className="grid gap-2 text-sm text-white/62">
                        {meta.targetLabel}
                        <div className="relative">
                          <Hash className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/24" />
                          <Input
                            value={config.target}
                            onChange={(event) =>
                              updateIntegration(integration, {
                                target: event.target.value,
                              })
                            }
                            placeholder={meta.targetPlaceholder}
                            className="h-11 rounded-[18px] border-white/8 bg-black/30 pl-10 pr-4 text-white/78 placeholder:text-white/20"
                          />
                        </div>
                      </label>

                      <label className="grid gap-2 text-sm text-white/62">
                        Message notes
                        <Textarea
                          value={config.notes}
                          onChange={(event) =>
                            updateIntegration(integration, {
                              notes: event.target.value,
                            })
                          }
                          placeholder={`What should ${selectedAgent.name} send to ${meta.title}?`}
                          className="min-h-24 resize-none rounded-[18px] border-white/8 bg-black/30 p-4 text-white/78 placeholder:text-white/20"
                        />
                      </label>
                    </div>
                  </div>
                </PanelCard>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}
