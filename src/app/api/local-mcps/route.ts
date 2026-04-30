import { NextResponse } from "next/server";

import { listLocalMcpServers } from "@/lib/server/local-mcp-discovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const mcps = await listLocalMcpServers();

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    mcps,
  });
}
