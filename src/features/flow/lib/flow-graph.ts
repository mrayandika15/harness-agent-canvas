import { MarkerType, type Edge, type Node } from "@xyflow/react";

import { flowSteps } from "@/features/flow/lib/flow-data";
import type { FlowStep } from "@/features/flow/types/flow-step";

const positions = [
  { x: 80, y: 120 },
  { x: 340, y: 120 },
  { x: 600, y: 120 },
  { x: 860, y: 120 },
  { x: 1120, y: 120 },
  { x: 1380, y: 120 },
];

function getPosition(index: number) {
  return positions[index] ?? {
    x: 80 + index * 260,
    y: 120,
  };
}

export function buildInitialNodes(steps: FlowStep[] = flowSteps): Node[] {
  return steps.map((step, index) => ({
    id: step.id,
    type: "flowStep",
    position: getPosition(index),
    dragHandle: ".flow-node-drag-handle",
    data: {
      ...step,
      index,
    },
  }));
}

export function buildInitialEdges(steps: FlowStep[] = flowSteps): Edge[] {
  return steps.slice(0, -1).map((step, index) => ({
    id: `${step.id}-${steps[index + 1]?.id}`,
    source: step.id,
    target: steps[index + 1].id,
    type: "smoothstep",
    animated: true,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 18,
      height: 18,
      color: "rgba(149, 232, 215, 0.72)",
    },
    style: {
      stroke: "rgba(149, 232, 215, 0.48)",
      strokeWidth: 2,
    },
  }));
}
