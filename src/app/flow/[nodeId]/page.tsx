import { AgentCanvasShell } from "@/app/_components/agent-canvas-shell";
import { FlowNodeDetailPage } from "@/features/flow/components/flow-node-detail-page";

export default async function FlowNodePage({
  params,
}: {
  params: Promise<{ nodeId: string }>;
}) {
  const { nodeId } = await params;

  return (
    <AgentCanvasShell>
      <FlowNodeDetailPage nodeId={nodeId} />
    </AgentCanvasShell>
  );
}
