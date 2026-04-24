"use client";

import { useEffect, useState } from "react";

import {
  Background,
  MarkerType,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";

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
          index,
          canAdd: index === allNodes.length - 1 && !isSavingNewNode,
          onAddStep: handleAddStep,
        },
      })),
    );
  }, [isSavingNewNode, selectedFlowNodeId, setNodes, flowStepItems.length]);

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
        x: (lastNode?.position.x ?? 0) + 300,
        y: lastNode ? (lastNode.position.y === 150 ? 260 : 150) : 150,
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
    <section className="relative min-h-0 flex-1 bg-[rgba(5,5,5,0.82)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.74 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        panOnDrag={false}
        selectionOnDrag={false}
        className="!bg-transparent"
      >
        <Background color="rgba(255,255,255,0.03)" gap={44} size={1} />
      </ReactFlow>
    </section>
  );
}
