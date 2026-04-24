import type { LucideIcon } from "lucide-react";

export type FlowStep = {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  connectedMcp: string[];
};
