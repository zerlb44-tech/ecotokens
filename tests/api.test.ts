import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/runs/route";

describe("POST /api/runs", () => {
  it("creates a bounded mock run without external credentials", async () => {
    const response = await POST(new Request("http://localhost/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "Add strict validation and tests",
        providers: ["FREEMODEL", "GROQ", "GEMINI"],
        maxTokens: 12_000,
        maxCostUsd: 1,
      }),
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ state: "COMPLETED", pullRequest: { draft: true } });
  });

  it("returns a generic error for malformed requests", async () => {
    const response = await POST(new Request("http://localhost/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: "short", providers: [] }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid bounded run request" });
  });
});
