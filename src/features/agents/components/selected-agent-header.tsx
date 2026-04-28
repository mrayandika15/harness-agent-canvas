"use client";

import { usePathname, useRouter } from "next/navigation";
import { MessageSquareText, PanelTop, Settings } from "lucide-react";

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
  const selectedAgentName = useWorkspaceStore((state) => state.selectedAgentName);
  const setAppView = useWorkspaceStore((state) => state.setAppView);

  const selectedAgent =
    agentItems.find((agent) => agent.name === selectedAgentName) ?? agentItems[0];

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
            <PixelAgent color={selectedAgent.color} icon={selectedAgent.icon} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-[family-name:var(--font-display)] text-[2rem] font-bold leading-none tracking-[-0.06em] text-white">
                {selectedAgent.name} Flows
              </h1>
              <Badge className="rounded-full bg-[rgba(134,216,155,0.14)] px-3 text-[#abffbf]">
                Online
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-white/42">
              {selectedAgent.personality
                ? selectedAgent.personality.replace(/^#+\s*/m, "").split("\n")[0]
                : "Application-level orchestration across separated features"}
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
                className="rounded-full px-4 data-active:bg-[rgba(245,148,78,0.14)] data-active:text-white"
                title="Chat"
              >
                <MessageSquareText className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger
                value="integrations"
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
