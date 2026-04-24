import {
  BrainCircuit,
  Code2,
  Diamond,
  Search,
  ShieldCheck,
  Zap,
} from "lucide-react";

import type { FlowStep } from "@/features/flow/types/flow-step";

export const flowSteps: FlowStep[] = [
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

export function createFlowStep(index: number): FlowStep {
  return {
    id: `step-${index}`,
    step: `Step ${index}`,
    title: `Custom Step ${index}`,
    subtitle: "New workflow stage",
    icon: Code2,
    connectedMcp: ["dummy-mcp", "dummy-memory", "dummy-output"],
  };
}

export function createDummyMarkdownContent(step: FlowStep) {
  return `# ${step.title}

Operational brief for ${step.title.toLowerCase()}.

## Purpose

- Describe the exact intent of ${step.step.toLowerCase()}
- Clarify which MCP tools are mandatory
- Keep the output easy for the next operator to execute

## Required Inputs

- Upstream workflow context
- Tool configuration
- Any constraints inherited from the previous node

## Outputs

- Primary deliverable
- Structured handoff data
- Validation notes

## Success Criteria

- Output is technically complete
- Tool usage is explicit
- Downstream agent can continue without clarification
`;
}
