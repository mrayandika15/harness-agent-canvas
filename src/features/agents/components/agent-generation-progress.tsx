"use client";

import { Loader2 } from "lucide-react";

import type { Agent } from "@/features/agents/types/agent";

type AgentGenerationProgressProps = {
  agent: Agent;
  surface: "canvas" | "chat";
};

export function AgentGenerationProgress({
  agent,
  surface: _surface,
}: AgentGenerationProgressProps) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/52 backdrop-blur-[2px]" />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#95e8d7]" />
        <p className="text-sm font-medium text-white/74">
          Generating {agent.name}...
        </p>
      </div>
    </div>
  );
}
