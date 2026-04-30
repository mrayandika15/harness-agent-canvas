import { NextResponse } from "next/server";

export async function GET(
  _: Request,
  context: { params: Promise<{ nodeId: string }> },
) {
  await context.params;

  return NextResponse.json(
    { error: "Flow node content is now scoped by agent." },
    { status: 410 },
  );
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ nodeId: string }> },
) {
  await context.params;
  await request.json().catch(() => null);

  return NextResponse.json(
    { error: "Use /api/agents/:agentId/flow/nodes/:nodeId instead." },
    { status: 410 },
  );
}
