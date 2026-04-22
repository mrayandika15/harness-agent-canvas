import { MarkerType, type Edge, type Node } from "@xyflow/react";
import {
  Bot,
  BrainCircuit,
  Code2,
  Diamond,
  MessageSquareText,
  Search,
  Settings2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const sidebarItems = [
  { label: "Manage Agent", icon: Settings2, active: true },
  { label: "Chat With Agent", icon: MessageSquareText, active: false },
];

export const agentList = [
  { name: "Robo", status: "Idle", color: "#F5F5F5" },
  { name: "Devo", status: "Idle", color: "#8CB4FF" },
  { name: "Eddo", status: "Idle", color: "#EBC05F" },
  { name: "Bizo", status: "Idle", color: "#B98EFF" },
  { name: "Como", status: "Idle", color: "#95E8D7" },
  { name: "Asto", status: "Idle", color: "#FF8E97" },
];

export type FlowStepMeta = {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  connectedMcp: string[];
};

export const flowSteps: FlowStepMeta[] = [
  {
    id: "persona",
    step: "Core",
    title: "Persona Kernel",
    subtitle: "System role, constraints, and behavior",
    icon: BrainCircuit,
    connectedMcp: ["persona-router", "system-prompt", "policy-guard"],
  },
  {
    id: "scrape",
    step: "Step 1",
    title: "Apify Scrape",
    subtitle: "Collect page content and state",
    icon: Search,
    connectedMcp: ["apify", "browser", "snapshot-reader"],
  },
  {
    id: "qualify",
    step: "Step 2",
    title: "Site Qualify",
    subtitle: "Evaluate output and route actions",
    icon: Diamond,
    connectedMcp: ["rules-engine", "quality-check", "memory-read"],
  },
  {
    id: "compose",
    step: "Step 3",
    title: "Code Compose",
    subtitle: "Generate implementation output",
    icon: Code2,
    connectedMcp: ["codex", "filesystem", "artifact-writer"],
  },
  {
    id: "memory",
    step: "Step 4",
    title: "Memory Sync",
    subtitle: "Persist session context locally",
    icon: ShieldCheck,
    connectedMcp: ["claude-mem", "sqlite", "session-store"],
  },
  {
    id: "deploy",
    step: "Step 5",
    title: "Deploy Preview",
    subtitle: "Ship preview result",
    icon: Zap,
    connectedMcp: ["vercel", "preview-deploy", "status-webhook"],
  },
];

const positions = [
  { x: 80, y: 160 },
  { x: 360, y: 70 },
  { x: 640, y: 220 },
  { x: 950, y: 120 },
  { x: 1260, y: 270 },
  { x: 1560, y: 150 },
];

export const initialNodes: Node[] = flowSteps.map((step, index) => ({
  id: step.id,
  type: "flowStep",
  position: positions[index],
  dragHandle: ".flow-node-drag-handle",
  data: {
    ...step,
    index,
  },
}));

export const initialEdges: Edge[] = flowSteps.slice(0, -1).map((step, index) => ({
  id: `${step.id}-${flowSteps[index + 1]?.id}`,
  source: step.id,
  target: flowSteps[index + 1].id,
  type: "straight",
  animated: false,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 18,
    height: 18,
    color: "rgba(119, 173, 104, 0.72)",
  },
  style: {
    stroke: "rgba(119, 173, 104, 0.62)",
    strokeWidth: 2,
    strokeDasharray: "7 7",
  },
}));

export const brandMark = Bot;

export function createFlowStepMeta(index: number): FlowStepMeta {
  const stepNumber = index;

  return {
    id: `step-${stepNumber}`,
    step: `Step ${stepNumber}`,
    title: `Custom Step ${stepNumber}`,
    subtitle: "New workflow stage",
    icon: Code2,
    connectedMcp: ["dummy-mcp", "dummy-memory", "dummy-output"],
  };
}

export function createDummyMarkdownContent(step: FlowStepMeta) {
  return `# ${step.title}

Describe the goal and execution logic for ${step.title.toLowerCase()}.

## Purpose

- Placeholder purpose for ${step.step.toLowerCase()}
- Replace this with real workflow instructions
- Connect the correct MCP tools and outputs

## Outputs

- Dummy output A
- Dummy output B
- Dummy output C
`;
}
