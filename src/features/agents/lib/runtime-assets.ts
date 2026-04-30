import type { AgentRuntime } from "@/features/agents/types/agent";

export const runtimeLabels = {
  claude: "Claude",
  codex: "Codex",
} satisfies Record<AgentRuntime, string>;

export const runtimeAccents = {
  claude: "rgba(245,148,78,0.95)",
  codex: "rgba(149,232,215,0.95)",
} satisfies Record<AgentRuntime, string>;

export const runtimeIcons = {
  claude:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRnkErT1NHfXKAiT6Wnhx3wGsauDrW7UZ0G2Q&s",
  codex: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/chatgpt.png",
} satisfies Record<AgentRuntime, string>;
