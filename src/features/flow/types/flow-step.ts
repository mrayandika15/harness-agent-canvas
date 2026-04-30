import type { LucideIcon } from "lucide-react";

export type FlowStep = {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  iconKey?: string;
  icon: LucideIcon;
  connectedMcp: string[];
  sourceLinks: string[];
  instructionStatus: "draft" | "ready" | "review";
};
