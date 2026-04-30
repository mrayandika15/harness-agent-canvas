import { getFlowIcon } from "@/features/flow/lib/flow-icons";
import type { FlowStep } from "@/features/flow/types/flow-step";

export const flowSteps: FlowStep[] = [
  {
    id: "orchestrate",
    step: "Skill",
    title: "Orchestrate Requests",
    subtitle: "Routes every agent step from one local SKILL.md",
    iconKey: "brain",
    icon: getFlowIcon("brain"),
    connectedMcp: ["local-cli", "claude-memory", "runtime-router"],
    sourceLinks: [],
    instructionStatus: "ready",
  },
];

export function createFlowStep(index: number): FlowStep {
  const agentStepNumber = Math.max(index, 1);

  return {
    id: `agent-step-${agentStepNumber}`,
    step: "Agent",
    title: `Agent Step ${agentStepNumber}`,
    subtitle: "Agent step coordinated by the orchestrator skill",
    iconKey: "code",
    icon: getFlowIcon("code"),
    connectedMcp: ["local-cli", "claude-memory", "runtime-router"],
    sourceLinks: [],
    instructionStatus: "draft",
  };
}

export function createDummyMarkdownContent(step: FlowStep) {
  if (step.step === "Skill") {
    return `# ${step.title}

This is the root SKILL.md for the Harness Canvas. It coordinates the agent steps that follow it.

## Purpose

- Read the user request and current canvas state
- Choose the correct downstream agent step
- Pass only the context that step needs
- Keep local Claude and Codex execution aligned with Claude-Mem project memory

## Orchestration Rules

- Run agent steps in canvas order unless the user asks for a targeted step
- Do not skip required approval gates
- Preserve memory and handoff notes between steps
- Keep outputs concise, actionable, and ready for the next agent

## Success Criteria

- Every agent step has a clear handoff
- Local runtime behavior matches this canvas
- The final response reflects the completed agent sequence
`;
  }

  return `# ${step.title}

Agent-step brief for ${step.title.toLowerCase()}.

## Purpose

- Execute this agent step after orchestration
- Clarify which local CLI or MCP tools are mandatory
- Return a clean handoff for the orchestrator

## Required Inputs

- User request and upstream orchestrator context
- Tool configuration
- Any constraints inherited from the previous node

## Outputs

- Primary deliverable
- Structured handoff data
- Validation notes for the orchestrator

## Success Criteria

- Output is technically complete
- Tool usage is explicit
- The orchestrator can route the next agent without clarification
`;
}
