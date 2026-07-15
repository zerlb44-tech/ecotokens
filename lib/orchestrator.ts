import type { Provider, RunRequest } from "./contracts";

export const DEFAULT_LIMITS = {
  maxCalls: 8,
  maxCorrectionCycles: 2,
  maxConcurrentPaidCalls: 2,
} as const;

export type RunState =
  | "QUEUED"
  | "PLANNING"
  | "CODING"
  | "REVIEWING"
  | "VERIFYING"
  | "READY_FOR_PR"
  | "COMPLETED"
  | "STOPPED"
  | "FAILED"
  | "BUDGET_EXHAUSTED";

type TransitionEvent =
  | "START"
  | "PLAN_ACCEPTED"
  | "PATCH_APPLIED"
  | "REVIEW_COMPLETED"
  | "VERIFICATION_PASSED"
  | "PR_CREATED"
  | "STOP"
  | "FAIL"
  | "EXHAUST_BUDGET";

const terminalStates = new Set<RunState>(["COMPLETED", "STOPPED", "FAILED", "BUDGET_EXHAUSTED"]);
const transitions: Partial<Record<RunState, Partial<Record<TransitionEvent, RunState>>>> = {
  QUEUED: { START: "PLANNING", STOP: "STOPPED", FAIL: "FAILED", EXHAUST_BUDGET: "BUDGET_EXHAUSTED" },
  PLANNING: { PLAN_ACCEPTED: "CODING", STOP: "STOPPED", FAIL: "FAILED", EXHAUST_BUDGET: "BUDGET_EXHAUSTED" },
  CODING: { PATCH_APPLIED: "REVIEWING", STOP: "STOPPED", FAIL: "FAILED", EXHAUST_BUDGET: "BUDGET_EXHAUSTED" },
  REVIEWING: { REVIEW_COMPLETED: "VERIFYING", STOP: "STOPPED", FAIL: "FAILED", EXHAUST_BUDGET: "BUDGET_EXHAUSTED" },
  VERIFYING: { VERIFICATION_PASSED: "READY_FOR_PR", STOP: "STOPPED", FAIL: "FAILED", EXHAUST_BUDGET: "BUDGET_EXHAUSTED" },
  READY_FOR_PR: { PR_CREATED: "COMPLETED", STOP: "STOPPED", FAIL: "FAILED" },
};

export function transition(current: RunState, event: TransitionEvent): RunState {
  if (terminalStates.has(current)) throw new Error(`terminal state ${current} is immutable`);
  const next = transitions[current]?.[event];
  if (!next) throw new Error(`invalid transition ${current} -> ${event}`);
  return next;
}

export interface FreeModelCandidate {
  id: string;
  intelligence: number;
  price: number;
  context: number;
  available: boolean;
}

export function rankFreeModels(models: FreeModelCandidate[], requiredContext: number): FreeModelCandidate[] {
  return models
    .filter((model) => model.available && model.context >= requiredContext)
    .toSorted((a, b) => (b.intelligence - b.price * 100) - (a.intelligence - a.price * 100));
}

export interface TokenSavings {
  baselineTokens: number;
  actualTokens: number;
  savedTokens: number;
  savingsPercent: number;
  targetMet: boolean;
}

export function calculateTokenSavings(input: { baselineTokens: number; actualTokens: number }): TokenSavings {
  const baselineTokens = Math.max(1, Math.round(input.baselineTokens));
  const actualTokens = Math.max(0, Math.round(input.actualTokens));
  const savedTokens = Math.max(0, baselineTokens - actualTokens);
  const savingsPercent = Math.round((savedTokens / baselineTokens) * 100);
  return { baselineTokens, actualTokens, savedTokens, savingsPercent, targetMet: savingsPercent >= 70 };
}

export interface RunStep {
  id: string;
  label: string;
  provider?: Provider;
  state: "passed" | "skipped" | "stopped";
  tokens: number;
}

export interface MockRunResult {
  id: string;
  state: RunState;
  branch: string;
  steps: RunStep[];
  coverage: string[];
  usage: { calls: number; tokens: number; estimatedCostUsd: number };
  savings: TokenSavings;
  pullRequest?: { draft: true; title: string; url: string };
}

function step(id: string, label: string, provider: Provider | undefined, tokens: number, state: RunStep["state"] = "passed"): RunStep {
  return { id, label, provider, tokens, state };
}

export function createMockRun(input: Pick<RunRequest, "task" | "providers"> & Partial<Omit<RunRequest, "task" | "providers">>): MockRunResult {
  const maxTokens = input.maxTokens ?? 12_000;
  const maxCostUsd = input.maxCostUsd ?? 1;
  const runId = crypto.randomUUID().slice(0, 8);
  const has = (provider: Provider) => input.providers.includes(provider);
  const implementer: Provider = has("FREEMODEL") ? "FREEMODEL" : input.providers[0] ?? "FREEMODEL";
  const verifier: Provider = has("GEMINI") ? "GEMINI" : implementer;
  const reviewer = has("GROQ") ? "GROQ" : undefined;
  const taskTokens = Math.min(900, Math.max(180, Math.ceil(input.task.length * 1.8)));
  const steps = [
    step("map", "Bounded repository map", undefined, 180),
    step("plan", "Plan and implementation", implementer, taskTokens + 1_050),
    has("OPENAI") ? step("small", "Isolated tests and types", "OPENAI", 520) : step("small", "Small-task delegation omitted", undefined, 0, "skipped"),
    reviewer ? step("review", "Independent defect review", reviewer, 640) : step("review", "Review reassigned to primary", implementer, 420),
    step("verify", "Evidence verification", verifier, 520),
  ];
  const tokens = steps.reduce((total, current) => total + current.tokens, 0);
  const calls = steps.filter((current) => current.provider).length;
  const estimatedCostUsd = Number((tokens * 0.0000025).toFixed(4));
  const baselineTokens = input.baselineTokens ?? Math.max(20_000, tokens * 4);
  const savings = calculateTokenSavings({ baselineTokens, actualTokens: tokens });
  const coverage = [
    reviewer ? "Groq independent review completed" : "Groq review omitted",
    has("GEMINI") ? "Gemini independent verification completed" : "Gemini verification reassigned to FreeModel",
  ];

  if (tokens >= maxTokens || estimatedCostUsd >= maxCostUsd) {
    return {
      id: runId,
      state: "BUDGET_EXHAUSTED",
      branch: `ecotokens/${runId}`,
      steps: [...steps.slice(0, 2), step("budget", "Hard budget stopped the run", undefined, 0, "stopped")],
      coverage,
      usage: { calls: Math.min(calls, DEFAULT_LIMITS.maxCalls), tokens: Math.min(tokens, maxTokens), estimatedCostUsd: Math.min(estimatedCostUsd, maxCostUsd) },
      savings,
    };
  }

  return {
    id: runId,
    state: "COMPLETED",
    branch: `ecotokens/${runId}`,
    steps,
    coverage,
    usage: { calls, tokens, estimatedCostUsd },
    savings,
    pullRequest: {
      draft: true,
      title: `Ecotokens: ${input.task.slice(0, 72)}`,
      url: `https://github.com/example/ecotokens/pull/${runId}`,
    },
  };
}
