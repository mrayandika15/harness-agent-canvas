import {
  BrainCircuit,
  Code2,
  Diamond,
  Search,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const flowIconMap: Record<string, LucideIcon> = {
  brain: BrainCircuit,
  code: Code2,
  diamond: Diamond,
  search: Search,
  shield: ShieldCheck,
  zap: Zap,
};

export function getFlowIcon(iconKey?: string) {
  return flowIconMap[iconKey ?? ""] ?? Code2;
}
