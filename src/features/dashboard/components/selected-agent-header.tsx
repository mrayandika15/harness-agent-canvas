"use client";

import { MessageSquareText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PixelAgent } from "@/features/dashboard/components/pixel-agent";
import { agentList } from "@/features/dashboard/lib/dashboard-data";
import { useCanvasStore } from "@/stores/canvas-store";

export function SelectedAgentHeader() {
  const { appView, selectedAgentName, setAppView } = useCanvasStore();

  const selectedAgent =
    agentList.find((agent) => agent.name === selectedAgentName) ?? agentList[0];

  return (
    <header className="border-b border-white/6 bg-[rgba(7,7,7,0.72)] px-6 py-5 backdrop-blur-xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[rgba(217,134,75,0.26)] bg-[linear-gradient(180deg,rgba(54,29,15,0.68),rgba(27,15,8,0.4))] shadow-[0_0_18px_rgba(217,134,75,0.08)]">
            <PixelAgent color={selectedAgent.color} />
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-[2rem] font-bold leading-none tracking-[-0.06em] text-white">
              {selectedAgent.name} Flows
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/42">
              The command center for AI agents
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {appView === "chat" ? (
            <div className="inline-flex items-center gap-3 rounded-2xl border border-[rgba(98,182,117,0.24)] bg-[rgba(20,44,24,0.72)] px-4 py-3 text-sm font-semibold tracking-[-0.02em] text-white">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#62b675] opacity-55" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[#7ee08d]" />
              </span>
              Online
            </div>
          ) : (
            <Button
              variant="primary"
              className="rounded-2xl border-[rgba(217,134,75,0.4)] px-4"
              onClick={() => setAppView("chat")}
            >
              <MessageSquareText className="h-4 w-4" />
              Chat
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
