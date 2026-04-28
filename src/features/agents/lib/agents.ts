import type { Agent } from "@/features/agents/types/agent";

export const agents: Agent[] = [
  { name: "Robo", icon: "R", status: "Idle", color: "#F5F5F5" },
  { name: "Devo", icon: "D", status: "Building", color: "#8CB4FF" },
  { name: "Eddo", icon: "E", status: "Reviewing", color: "#EBC05F" },
  { name: "Bizo", icon: "B", status: "Waiting", color: "#B98EFF" },
  { name: "Como", icon: "C", status: "Routing", color: "#95E8D7" },
  { name: "Asto", icon: "A", status: "Planning", color: "#FF8E97" },
];
