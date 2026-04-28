"use client";

import { AgentCanvasShell } from "@/app/_components/agent-canvas-shell";
import { AgentIntegrationsWorkspace } from "@/features/agents/components/agent-integrations-workspace";
import { AgentSettingsWorkspace } from "@/features/agents/components/agent-settings-workspace";
import { AgentChatWorkspace } from "@/features/chat/components/agent-chat-workspace";
import { FlowCanvasAssistant } from "@/features/flow/components/flow-canvas-assistant";
import { FlowCanvas } from "@/features/flow/components/flow-canvas";
import { FlowNodeInspector } from "@/features/flow/components/flow-node-inspector";
import { flowSteps } from "@/features/flow/lib/flow-data";
import { useDashboardAutoplay } from "@/features/workspace/hooks/use-dashboard-autoplay";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";

export function DashboardScreen() {
  const appView = useWorkspaceStore((state) => state.appView);

  useDashboardAutoplay(flowSteps.length);

  return (
    <AgentCanvasShell>
      {appView === "settings" ? (
        <AgentSettingsWorkspace />
      ) : appView === "integrations" ? (
        <AgentIntegrationsWorkspace />
      ) : appView === "chat" ? (
        <AgentChatWorkspace />
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
