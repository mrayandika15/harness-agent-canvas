"use client";

import { AgentCanvasShell } from "@/app/_components/agent-canvas-shell";
import { PanelCard } from "@/components/app/panel-card";
import { Button } from "@/components/ui/button";
import { AgentIntegrationsWorkspace } from "@/features/agents/components/agent-integrations-workspace";
import { AgentSettingsWorkspace } from "@/features/agents/components/agent-settings-workspace";
import { AgentChatWorkspace } from "@/features/chat/components/agent-chat-workspace";
import { FlowCanvasAssistant } from "@/features/flow/components/flow-canvas-assistant";
import { FlowCanvas } from "@/features/flow/components/flow-canvas";
import { FlowNodeInspector } from "@/features/flow/components/flow-node-inspector";
import { useDashboardAutoplay } from "@/features/workspace/hooks/use-dashboard-autoplay";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";

export function DashboardScreen() {
  const appView = useWorkspaceStore((state) => state.appView);
  const agentItems = useWorkspaceStore((state) => state.agentItems);
  const flowStepItems = useWorkspaceStore((state) => state.flowStepItems);
  const hasAgent = agentItems.length > 0;

  useDashboardAutoplay(flowStepItems.length);

  return (
    <AgentCanvasShell>
      {appView === "settings" ? (
        <AgentSettingsWorkspace />
      ) : appView === "integrations" ? (
        <AgentIntegrationsWorkspace />
      ) : appView === "chat" ? (
        <AgentChatWorkspace />
      ) : !hasAgent ? (
        <NoAgentCanvasState />
      ) : (
        <>
          <FlowCanvas />
          <FlowCanvasAssistant />
          <FlowNodeInspector />
        </>
      )}
    </AgentCanvasShell>
  );
}

function NoAgentCanvasState() {
  return (
    <section className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[rgba(5,5,5,0.82)] p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(245,148,78,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.025),transparent_34%)]" />
      <PanelCard className="relative w-full max-w-xl rounded-[28px] border-white/8 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] border border-[rgba(245,148,78,0.24)] bg-[rgba(245,148,78,0.08)] text-2xl font-semibold text-[var(--accent-strong)]">
          +
        </div>
        <p className="mt-5 text-[11px] uppercase tracking-[0.24em] text-white/28">
          No Agent Selected
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
          Create an agent to build its skill canvas
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/42">
          The canvas represents the selected agent&apos;s skills. Add an agent in
          the sidebar first, then configure its flow, chat runtime, and memory.
        </p>
        <Button
          type="button"
          disabled
          variant="outline"
          className="mt-5 rounded-full border-white/10 bg-white/[0.03] px-4 text-white/42"
        >
          Use the sidebar Add button
        </Button>
      </PanelCard>
    </section>
  );
}
