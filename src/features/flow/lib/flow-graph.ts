import { MarkerType, type Edge, type Node } from "@xyflow/react";

import { flowSteps } from "@/features/flow/lib/flow-data";

const positions = [
  { x: 80, y: 160 },
  { x: 360, y: 70 },
  { x: 640, y: 220 },
  { x: 950, y: 120 },
  { x: 1260, y: 270 },
  { x: 1560, y: 150 },
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
    type: "straight",
    animated: false,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 18,
      height: 18,
      color: "rgba(245, 148, 78, 0.72)",
    },
    style: {
      stroke: "rgba(245, 148, 78, 0.54)",
      strokeWidth: 2,
      strokeDasharray: "7 7",
    },
  }));
}
