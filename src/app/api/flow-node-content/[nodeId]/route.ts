import { promises as fs } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

const CONTENT_DIR = path.join(process.cwd(), "content", "flow-nodes");

function getNodePath(nodeId: string) {
  return path.join(CONTENT_DIR, `${nodeId}.md`);
}

export async function GET(
  _: Request,
  context: { params: Promise<{ nodeId: string }> },
) {
  const { nodeId } = await context.params;

  try {
    const content = await fs.readFile(getNodePath(nodeId), "utf8");
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ nodeId: string }> },
) {
  const { nodeId } = await context.params;
  const body = (await request.json()) as { content?: string };

  if (typeof body.content !== "string") {
    return NextResponse.json({ error: "Invalid content" }, { status: 400 });
  }

  await fs.mkdir(CONTENT_DIR, { recursive: true });
  await fs.writeFile(getNodePath(nodeId), body.content, "utf8");

  return NextResponse.json({ ok: true });
}
