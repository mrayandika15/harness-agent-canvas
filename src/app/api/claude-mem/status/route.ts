import { NextResponse } from "next/server";

import { getClaudeMemStatus } from "@/lib/server/claude-mem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getClaudeMemStatus());
}
