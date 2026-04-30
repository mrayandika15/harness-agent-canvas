"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bot, MessageSquareText, PanelTop, Settings } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PixelAgent } from "@/features/agents/components/pixel-agent";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";
import type { AppView } from "@/features/workspace/types/workspace";

export function SelectedAgentHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const appView = useWorkspaceStore((state) => state.appView);
  const agentItems = useWorkspaceStore((state) => state.agentItems);
  const selectedAgentId = useWorkspaceStore((state) => state.selectedAgentId);
  const setAppView = useWorkspaceStore((state) => state.setAppView);

  const selectedAgent =
    agentItems.find((agent) => agent.id === selectedAgentId) ?? agentItems[0];
  const hasAgent = Boolean(selectedAgent);

  function handleViewChange(value: string) {
    const nextView = value as AppView;

    setAppView(nextView);

    if (pathname !== "/") {
      router.push("/");
    }
  }

  return (
    <header className="border-b border-white/6 bg-[rgba(7,7,7,0.72)] px-6 py-5 backdrop-blur-xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[rgba(245,148,78,0.24)] bg-[linear-gradient(180deg,rgba(73,39,18,0.62),rgba(27,15,8,0.3))] shadow-[0_0_18px_rgba(245,148,78,0.1)]">
            {selectedAgent ? (
              <PixelAgent color={selectedAgent.color} icon={selectedAgent.icon} />
            ) : (
              <Bot className="h-5 w-5 text-[var(--accent-strong)]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-[family-name:var(--font-display)] text-[1.65rem] font-bold leading-none tracking-[-0.06em] text-white sm:text-[2rem]">
                {selectedAgent ? `${selectedAgent.name} Flows` : "Agent Canvas"}
              </h1>
              {selectedAgent ? (
                <Badge
                  className={
                    selectedAgent.status === "Generating"
                      ? "rounded-full bg-[rgba(149,232,215,0.12)] px-3 text-[#b8fff1]"
                      : selectedAgent.status === "Failed"
                        ? "rounded-full bg-[#ff8e97]/12 px-3 text-[#ffb8c0]"
                        : "rounded-full bg-[rgba(134,216,155,0.14)] px-3 text-[#abffbf]"
                  }
                >
                  {selectedAgent.status === "Generating"
                    ? "Generating"
                    : selectedAgent.status === "Failed"
                      ? "Failed"
                      : "Online"}
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-white/42">
              {selectedAgent?.personality
                ? selectedAgent.personality.replace(/^#+\s*/m, "").split("\n")[0]
                : "Create an agent from the sidebar to unlock chat and integrations"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Tabs value={appView} onValueChange={handleViewChange}>
            <TabsList className="rounded-full border border-white/8 bg-white/[0.03] p-1">
              <TabsTrigger
                value="canvas"
                className="rounded-full px-4 data-active:bg-[rgba(245,148,78,0.14)] data-active:text-white"
                title="Canvas"
              >
                <PanelTop className="h-4 w-4" />
                Canvas
              </TabsTrigger>
              <TabsTrigger
                value="chat"
                disabled={!hasAgent}
                className="rounded-full px-4 data-active:bg-[rgba(245,148,78,0.14)] data-active:text-white"
                title="Chat"
              >
                <MessageSquareText className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger
                value="integrations"
                disabled={!hasAgent}
                className="rounded-full px-4 data-active:bg-[rgba(245,148,78,0.14)] data-active:text-white"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </header>
  );
}
