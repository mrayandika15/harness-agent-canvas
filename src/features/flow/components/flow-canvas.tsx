"use client";

import { useEffect, useState } from "react";

import {
  Background,
  Controls,
  MarkerType,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";

import { Badge } from "@/components/ui/badge";
import { saveFlowNodeContent } from "@/features/flow/api/flow-node-content";
import {
  createDummyMarkdownContent,
  createFlowStep,
} from "@/features/flow/lib/flow-data";
import { buildInitialEdges, buildInitialNodes } from "@/features/flow/lib/flow-graph";
import { FlowStepNode } from "@/features/flow/components/flow-step-node";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";

const nodeTypes: NodeTypes = {
  flowStep: FlowStepNode,
};

export function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(buildInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildInitialEdges());
  const [isSavingNewNode, setIsSavingNewNode] = useState(false);
  const selectedFlowNodeId = useWorkspaceStore((state) => state.selectedFlowNodeId);
  const flowStepItems = useWorkspaceStore((state) => state.flowStepItems);
  const setFlowStepItems = useWorkspaceStore((state) => state.setFlowStepItems);
  const setSelectedFlowNodeId = useWorkspaceStore(
    (state) => state.setSelectedFlowNodeId,
  );
  const setInspectorCollapsed = useWorkspaceStore(
    (state) => state.setInspectorCollapsed,
  );

  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((currentNode, index, allNodes) => ({
        ...currentNode,
        selected: currentNode.id === selectedFlowNodeId,
        data: {
          ...(currentNode.data as Record<string, unknown>),
          ...flowStepItems.find((step) => step.id === currentNode.id),
          index,
          canAdd: index === allNodes.length - 1 && !isSavingNewNode,
          onAddStep: handleAddStep,
        },
      })),
    );
  }, [isSavingNewNode, selectedFlowNodeId, setNodes, flowStepItems]);

  function handleNodeClick(_: React.MouseEvent, node: Node) {
    setSelectedFlowNodeId(node.id);
    setInspectorCollapsed(false);
    setNodes((currentNodes) =>
      currentNodes.map((currentNode) => ({
        ...currentNode,
        selected: currentNode.id === node.id,
      })),
    );
  }

  function handlePaneClick() {
    setSelectedFlowNodeId(null);
    setInspectorCollapsed(true);
    setNodes((currentNodes) =>
      currentNodes.map((currentNode) => ({
        ...currentNode,
        selected: false,
      })),
    );
  }

  async function handleAddStep() {
    setIsSavingNewNode(true);

    try {
      const nextStepNumber = flowStepItems.length;
      const nextMeta = createFlowStep(nextStepNumber);
      const lastNode = nodes[nodes.length - 1];
      const nextPosition = {
        x: (lastNode?.position.x ?? 0) + 340,
        y: lastNode?.position.y ?? 120,
      };

      const nextNode: Node = {
        id: nextMeta.id,
        type: "flowStep",
        position: nextPosition,
        dragHandle: ".flow-node-drag-handle",
        selected: true,
        data: {
          ...nextMeta,
          index: nodes.length,
          canAdd: true,
          onAddStep: handleAddStep,
        },
      };

      const nextEdge: Edge | null = lastNode
        ? {
            id: `${lastNode.id}-${nextMeta.id}`,
            source: lastNode.id,
            target: nextMeta.id,
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
          }
        : null;

      setFlowStepItems([...flowStepItems, nextMeta]);
      setSelectedFlowNodeId(nextMeta.id);
      setInspectorCollapsed(false);
      setNodes((currentNodes) => [
        ...currentNodes.map((currentNode) => ({
          ...currentNode,
          selected: false,
          data: {
            ...(currentNode.data as Record<string, unknown>),
            canAdd: false,
            onAddStep: handleAddStep,
          },
        })),
        nextNode,
      ]);

      if (nextEdge) {
        setEdges((currentEdges) => currentEdges.concat(nextEdge));
      }

      await saveFlowNodeContent(nextMeta.id, createDummyMarkdownContent(nextMeta));
    } finally {
      setIsSavingNewNode(false);
    }
  }

  return (
    <section className="relative min-h-0 flex-1 overflow-hidden bg-[rgba(5,5,5,0.82)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(149,232,215,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.025),transparent_32%)]" />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18, minZoom: 0.45, maxZoom: 0.95 }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.76 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        selectionOnDrag={false}
        minZoom={0.38}
        maxZoom={1.2}
        className="!bg-transparent"
      >
        <Panel position="top-left" className="!m-5">
          <div className="w-[310px] rounded-[24px] border border-white/8 bg-[rgba(10,10,10,0.78)] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/28">
              Harness Map
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">
              Agent instruction pipeline
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="rounded-full bg-[rgba(149,232,215,0.1)] px-3 text-[#b8fff1]">
                {flowStepItems.length} steps
              </Badge>
              <Badge className="rounded-full bg-white/[0.04] px-3 text-white/54">
                {flowStepItems.reduce((total, step) => total + step.sourceLinks.length, 0)} sources
              </Badge>
              <Badge className="rounded-full bg-white/[0.04] px-3 text-white/54">
                README driven
              </Badge>
            </div>
          </div>
        </Panel>

        <Background color="rgba(255,255,255,0.035)" gap={36} size={1} />
        <Controls
          position="top-right"
          className="!m-5 overflow-hidden !rounded-[16px] !border !border-white/8 !bg-[rgba(10,10,10,0.72)] !shadow-none [&_button]:!border-white/8 [&_button]:!bg-transparent [&_button]:!text-white/68"
        />
      </ReactFlow>
    </section>
  );
}
