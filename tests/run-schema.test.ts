import { describe, expect, it } from "vitest";
import { runRequestSchema } from "@/lib/contracts";

describe("run request", () => {
  it("requires a token and cost budget", () => {
    expect(() => runRequestSchema.parse({ task: "Fix bug", providers: ["FREEMODEL"] })).toThrow();
  });

  it("rejects a run without providers", () => {
    expect(() => runRequestSchema.parse({ task: "Fix bug", providers: [], maxTokens: 10_000, maxCostUsd: 1 })).toThrow();
  });

  it("rejects budgets outside the public MVP safety ceilings", () => {
    expect(() => runRequestSchema.parse({ task: "Fix bug", providers: ["FREEMODEL"], maxTokens: 1_000_001, maxCostUsd: 1 })).toThrow();
    expect(() => runRequestSchema.parse({ task: "Fix bug", providers: ["FREEMODEL"], maxTokens: 10_000, maxCostUsd: 101 })).toThrow();
  });
});
