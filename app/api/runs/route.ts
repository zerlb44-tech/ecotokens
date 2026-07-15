import { NextResponse } from "next/server";
import { runRequestSchema } from "@/lib/contracts";
import { createMockRun } from "@/lib/orchestrator";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_384) return NextResponse.json({ error: "Request body is too large" }, { status: 413 });

  try {
    const input = runRequestSchema.parse(await request.json());
    return NextResponse.json(createMockRun(input), {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Invalid bounded run request" }, { status: 400 });
  }
}
