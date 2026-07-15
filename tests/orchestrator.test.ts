import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIMITS,
  calculateTokenSavings,
  createMockRun,
  rankFreeModels,
  transition,
} from "@/lib/orchestrator";

describe("orchestrator state machine", () => {
  it("follows the verified pull request path", () => {
    expect(transition("VERIFYING", "VERIFICATION_PASSED")).toBe("READY_FOR_PR");
    expect(transition("READY_FOR_PR", "PR_CREATED")).toBe("COMPLETED");
  });

  it("keeps terminal states immutable", () => {
    expect(() => transition("STOPPED", "START")).toThrow("terminal state STOPPED is immutable");
  });
});

describe("FreeModel ranking", () => {
  it("selects a capable economical fallback when primary quota is exhausted", () => {
    const ranked = rankFreeModels([
      { id: "free-fast", intelligence: 72, price: 0, context: 128_000, available: true },
      { id: "gpt-5.4-mini", intelligence: 96, price: 0.2, context: 256_000, available: false },
      { id: "free-smart", intelligence: 84, price: 0.05, context: 128_000, available: true },
    ], 80_000);

    expect(ranked.map((model) => model.id)).toEqual(["free-smart", "free-fast"]);
  });
});

describe("bounded mock run", () => {
  it("uses FreeModel as primary and stays within hard limits", () => {
    const run = createMockRun({ task: "Add validation", providers: ["FREEMODEL", "OPENAI", "GROQ", "GEMINI"] });

    expect(run.state).toBe("COMPLETED");
    expect(run.steps[1]?.provider).toBe("FREEMODEL");
    expect(run.usage.calls).toBeLessThanOrEqual(DEFAULT_LIMITS.maxCalls);
    expect(run.pullRequest?.draft).toBe(true);
  });

  it("reports degraded coverage when verification providers are missing", () => {
    const run = createMockRun({ task: "Add validation", providers: ["FREEMODEL"] });

    expect(run.coverage).toContain("Groq review omitted");
    expect(run.coverage).toContain("Gemini verification reassigned to FreeModel");
  });

  it("stops before exceeding the mandatory token budget", () => {
    const run = createMockRun({
      task: "Add validation",
      providers: ["FREEMODEL"],
      maxTokens: 500,
      maxCostUsd: 1,
    });

    expect(run.state).toBe("BUDGET_EXHAUSTED");
    expect(run.pullRequest).toBeUndefined();
  });
});

describe("token efficiency", () => {
  it("reports measured savings against a full-context baseline", () => {
    expect(calculateTokenSavings({ baselineTokens: 20_000, actualTokens: 5_400 })).toEqual({
      baselineTokens: 20_000,
      actualTokens: 5_400,
      savedTokens: 14_600,
      savingsPercent: 73,
      targetMet: true,
    });
  });

  it("does not claim the target when measured savings are lower", () => {
    expect(calculateTokenSavings({ baselineTokens: 10_000, actualTokens: 4_500 }).targetMet).toBe(false);
  });
});
