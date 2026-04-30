"use client";

import { useEffect, useState } from "react";

import {
  Background,
  Controls,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Node,
  type NodeTypes,
} from "@xyflow/react";

import { Badge } from "@/components/ui/badge";
import { AgentGenerationProgress } from "@/features/agents/components/agent-generation-progress";
import {
  createAgentFlowNode,
  deleteAgentFlowNode,
  fetchAgentFlow,
} from "@/features/flow/api/agent-flow";
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
  const agentItems = useWorkspaceStore((state) => state.agentItems);
  const selectedAgentId = useWorkspaceStore((state) => state.selectedAgentId);
  const selectedFlowNodeId = useWorkspaceStore((state) => state.selectedFlowNodeId);
  const flowStepItems = useWorkspaceStore((state) => state.flowStepItems);
  const [nodes, setNodes, onNodesChange] = useNodesState(
    buildInitialNodes(flowStepItems),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    buildInitialEdges(flowStepItems),
  );
  const [isSavingNewNode, setIsSavingNewNode] = useState(false);
  const setFlowStepItems = useWorkspaceStore((state) => state.setFlowStepItems);
  const setActiveStep = useWorkspaceStore((state) => state.setActiveStep);
  const setSelectedFlowNodeId = useWorkspaceStore(
    (state) => state.setSelectedFlowNodeId,
  );
  const setInspectorCollapsed = useWorkspaceStore(
    (state) => state.setInspectorCollapsed,
  );
  const selectedAgent =
    agentItems.find((agent) => agent.id === selectedAgentId) ?? agentItems[0];
  const isGeneratingAgent = selectedAgent?.status === "Generating";

  useEffect(() => {
    if (!selectedAgentId || isGeneratingAgent) {
      setFlowStepItems([]);
      setSelectedFlowNodeId(null);
      setNodes([]);
      setEdges([]);
      return;
    }

    let cancelled = false;

    async function loadAgentFlow() {
      const flow = await fetchAgentFlow(selectedAgentId);

      if (cancelled) {
        return;
      }

      setFlowStepItems(flow.nodes);
      setSelectedFlowNodeId(null);
      setActiveStep(0);
      setInspectorCollapsed(true);
      setNodes(buildInitialNodes(flow.nodes));
      setEdges(buildInitialEdges(flow.nodes));
    }

    void loadAgentFlow();

    return () => {
      cancelled = true;
    };
  }, [
    selectedAgentId,
    isGeneratingAgent,
    setActiveStep,
    setEdges,
    setFlowStepItems,
    setInspectorCollapsed,
    setNodes,
    setSelectedFlowNodeId,
  ]);

  useEffect(() => {
    setNodes(
      buildInitialNodes(flowStepItems).map((node) => ({
        ...node,
        selected: node.id === selectedFlowNodeId,
      })),
    );
    setEdges(buildInitialEdges(flowStepItems));
  }, [flowStepItems, selectedFlowNodeId, setEdges, setNodes]);

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
          canDelete: index > 0,
          onAddStep: handleAddStep,
          onDeleteStep: () => {
            void handleDeleteStep(currentNode.id);
          },
        },
      })),
    );
  }, [isSavingNewNode, selectedFlowNodeId, setNodes, flowStepItems]);

  function handleNodeClick(_: React.MouseEvent, node: Node) {
    const nextIndex = flowStepItems.findIndex((step) => step.id === node.id);

    setSelectedFlowNodeId(node.id);
    setActiveStep(Math.max(nextIndex, 0));
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
    if (!selectedAgentId) {
      return;
    }

    setIsSavingNewNode(true);

    try {
      const nextStepNumber = flowStepItems.length;
      const nextMeta = createFlowStep(nextStepNumber);
      const flow = await createAgentFlowNode(
        selectedAgentId,
        nextMeta,
        createDummyMarkdownContent(nextMeta),
      );

      setFlowStepItems(flow.nodes);
      setSelectedFlowNodeId(null);
      setActiveStep(Math.max(flow.nodes.findIndex((step) => step.id === nextMeta.id), 0));
      setInspectorCollapsed(true);
      setNodes(
        buildInitialNodes(flow.nodes).map((node) => ({
          ...node,
          selected: false,
        })),
      );
      setEdges(buildInitialEdges(flow.nodes));
    } finally {
      setIsSavingNewNode(false);
    }
  }

  async function handleDeleteStep(nodeId: string) {
    if (!selectedAgentId) {
      return;
    }

    const targetNode = flowStepItems.find((step) => step.id === nodeId);

    if (!targetNode || targetNode.step === "Skill") {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${targetNode.title}"?\n\nThis removes the node, its Markdown content, generated local skill files, and reconnects the remaining canvas steps.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const flow = await deleteAgentFlowNode(selectedAgentId, nodeId);

      setFlowStepItems(flow.nodes);
      setSelectedFlowNodeId(null);
      setActiveStep(
        Math.max(
          flow.nodes.findIndex((step) => step.id === nodeId),
          0,
        ),
      );
      setInspectorCollapsed(true);
      setNodes(
        buildInitialNodes(flow.nodes).map((node) => ({
          ...node,
          selected: false,
        })),
      );
      setEdges(buildInitialEdges(flow.nodes));
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Unable to delete flow node.",
      );
    }
  }

  return (
    <section className="relative min-h-0 flex-1 overflow-hidden bg-[rgba(5,5,5,0.82)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(149,232,215,0.08),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.025),transparent_32%)]" />
      {isGeneratingAgent && selectedAgent ? (
        <AgentGenerationProgress agent={selectedAgent} surface="canvas" />
      ) : null}
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
