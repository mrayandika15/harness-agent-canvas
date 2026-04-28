import { MarkerType, type Edge, type Node } from "@xyflow/react";

import { flowSteps } from "@/features/flow/lib/flow-data";

const positions = [
  { x: 80, y: 120 },
  { x: 420, y: 120 },
  { x: 760, y: 120 },
  { x: 1100, y: 120 },
  { x: 1440, y: 120 },
  { x: 1780, y: 120 },
];

export function buildInitialNodes(): Node[] {
  return flowSteps.map((step, index) => ({
    id: step.id,
    type: "flowStep",
    position: positions[index],
    dragHandle: ".flow-node-drag-handle",
    data: {
      ...step,
      index,
    },
  }));
}

export function buildInitialEdges(): Edge[] {
  return flowSteps.slice(0, -1).map((step, index) => ({
    id: `${step.id}-${flowSteps[index + 1]?.id}`,
    source: step.id,
    target: flowSteps[index + 1].id,
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
