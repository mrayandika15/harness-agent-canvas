"use client";

import { useEffect } from "react";

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

import {
  createDummyMarkdownContent,
  createFlowStepMeta,
  initialEdges,
  initialNodes,
} from "@/features/dashboard/lib/dashboard-data";
import { FlowStepNode } from "@/features/dashboard/components/flow-step-node";
import { useCanvasStore } from "@/stores/canvas-store";

const nodeTypes: NodeTypes = {
  flowStep: FlowStepNode,
};

export function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const {
    selectedFlowNodeId,
    flowStepItems,
    appendFlowStepItem,
    setSelectedFlowNodeId,
    setInspectorCollapsed,
    setMarkdownSidebarOpen,
  } = useCanvasStore();

  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((currentNode, index, allNodes) => ({
        ...currentNode,
        selected: currentNode.id === selectedFlowNodeId,
        data: {
          ...(currentNode.data as Record<string, unknown>),
          index,
          canAdd: index === allNodes.length - 1,
          onAddStep: handleAddStep,
        },
      })),
    );
  }, [selectedFlowNodeId, setNodes, flowStepItems.length]);

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
    setMarkdownSidebarOpen(false);
    setNodes((currentNodes) =>
      currentNodes.map((currentNode) => ({
        ...currentNode,
        selected: false,
      })),
    );
  }

  async function handleAddStep() {
    const nextStepNumber = flowStepItems.length;
    const nextMeta = createFlowStepMeta(nextStepNumber);
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
            color: "rgba(119, 173, 104, 0.72)",
          },
          style: {
            stroke: "rgba(119, 173, 104, 0.62)",
            strokeWidth: 2,
            strokeDasharray: "7 7",
          },
        }
      : null;

    appendFlowStepItem(nextMeta);
    setSelectedFlowNodeId(nextMeta.id);
    setInspectorCollapsed(false);
    setNodes((currentNodes) => [
      ...currentNodes
        .map((currentNode) => ({
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

    await fetch(`/api/flow-node-content/${nextMeta.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: createDummyMarkdownContent(nextMeta) }),
    });
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
