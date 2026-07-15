# Ecotokens MVP Design

## 1. Product Summary

Ecotokens is a BYOK web application that coordinates multiple AI providers to make code changes in a GitHub repository. The service works in an isolated branch, verifies changes in a sandbox, and creates a draft pull request for human approval.

FreeModel is the primary coding provider. OpenAI handles small isolated coding tasks, Groq Cloud reviews changes for defects, and Gemini verifies build and test evidence. Missing providers do not block a run; the orchestrator reassigns supported roles and reports reduced verification coverage.

## 2. MVP Goals

- Let a user connect GitHub and at least one AI provider.
- Encrypt and store user-provided API credentials.
- Select economical, capable models from those available to each credential.
- Use FreeModel as the primary implementation agent with automatic model fallback.
- Safely coordinate generation, review, correction, and verification.
- Run repository commands in a constrained, temporary sandbox.
- Create a branch and draft pull request, never merge automatically.
- Enforce hard limits on steps, retries, concurrency, tokens, and estimated cost.
- Produce a useful partial result or a clear safe-stop explanation when a full run is impossible.

## 3. Non-Goals

- Automatic pull request merging.
- GitLab or Bitbucket support.
- Mobile or desktop clients.
- Model training or fine-tuning.
- Deployment, package publishing, or production infrastructure changes.
- Selling bundled model tokens or operating shared provider credentials.
- Collaborative source editing in the browser.

## 4. User Flow

1. The user signs in and installs the Ecotokens GitHub App.
2. The user chooses a repository and base branch.
3. The user adds one or more provider connections: Google AI Studio, Groq Cloud, OpenAI, or FreeModel.
4. For FreeModel, the user selects OpenAI-compatible or Anthropic-compatible protocol and supplies a base URL when needed.
5. Ecotokens validates credentials and discovers available models when the provider exposes a model-list endpoint.
6. The user accepts recommended models or overrides them, then sets a maximum cost for the run.
7. The user describes a coding task and chooses Orchestrator mode or Experimental Team mode.
8. Ecotokens creates a temporary branch and sandbox, analyzes the repository, and executes the bounded workflow.
9. The user sees live steps, model substitutions, findings, command results, budget use, and stop requests.
10. Ecotokens creates a draft pull request when safety and verification gates pass. Otherwise it preserves the branch when useful and shows a clear terminal result.

## 5. Operating Modes

### 5.1 Orchestrator Mode

This is the default and recommended mode. A central deterministic state machine assigns roles, mediates all model communication, applies patches, controls retries, enforces budgets, and decides whether a stop request changes run state.

Default limits:

- Maximum model calls per run: 8.
- Maximum correction cycles: 2.
- Maximum concurrent paid calls: 2.
- Maximum retries per transiently failed step: 2.
- User-defined maximum token and monetary budgets are mandatory.

### 5.2 Experimental Team Mode

Models may exchange structured messages only through the orchestrator. They cannot call one another directly, alter limits, apply patches, run commands, or stop a run themselves.

Default limits:

- Maximum agent messages: 12.
- Maximum agent steps: 6.
- Maximum concurrent paid calls: 2.
- Maximum correction cycles: 2.
- The same mandatory user-defined token and monetary budgets.

## 6. Agent Roles

### 6.1 FreeModel: Primary Implementer

- Produces the implementation plan.
- Writes complex or cross-file code.
- Integrates small patches produced by other models.
- Resolves critical and high-confidence review findings.
- Remains the primary implementer after fallback to another FreeModel model.

### 6.2 OpenAI: Small-Task Implementer

- Recommended starting model: `gpt-4o-mini`, subject to API availability.
- Produces small isolated files, tests, types, schemas, and straightforward CRUD.
- Does not independently integrate broad architectural changes.

### 6.3 Groq Cloud: Defect Reviewer

- Uses the best available economical coding or reasoning model exposed to the user's key.
- Reviews the current diff for bugs, regressions, security problems, and missing tests.
- Returns structured findings and does not directly apply changes.

### 6.4 Gemini: Evidence Verifier

- Recommended starting model: `gemini-2.5-flash`, subject to API availability.
- Reviews the original task, final diff, build output, linter output, and test output.
- Returns a structured final verdict and unresolved risks.

## 7. Provider Abstraction and Model Selection

All providers implement a common adapter contract:

- Validate credentials without exposing them to logs.
- List models when supported.
- Normalize chat or response requests.
- Normalize token usage, finish reason, rate-limit metadata, and errors.
- Support request cancellation and strict output limits.

FreeModel supports two adapter protocols:

- OpenAI-compatible.
- Anthropic-compatible.

The FreeModel model ranker scores available models using:

- Coding and reasoning capability metadata when available.
- Context-window fit for the prepared task packet.
- Tool or structured-output support.
- User-configured price data or provider-published pricing.
- Historical success for the current language and repository type.
- Availability and remaining quota signals.

The user may override recommendations, but the UI warns when a selected model lacks context or structured-output capability.

## 8. FreeModel Fallback

Before a run, Ecotokens builds an ordered FreeModel candidate list from the models available to the user's credential. The strongest suitable economical model is primary; weaker but capable models become fallbacks.

Fallback occurs only for:

- Model-specific quota exhaustion.
- HTTP 429 after the bounded retry policy is exhausted.
- Model removal or temporary unavailability.
- A model price that would violate the remaining run budget.

Fallback does not occur for invalid credentials, malformed requests, policy rejection, unsafe output, or an incompatible context size. These conditions require correction or a safe stop.

On fallback, the orchestrator sends a compact task packet rather than replaying the complete conversation. The packet contains the original task, accepted plan, current diff, relevant repository map, command evidence, open findings, and remaining budget. The UI and pull request report record every substitution and resulting coverage limitation.

If no FreeModel candidate satisfies minimum coding, context, and budget requirements, complex generation stops. Another provider may take over only if its discovered model satisfies the same role policy; this is explicit reassignment, not a blind fallback.

## 9. Workflow State Machine

Non-terminal states:

- `QUEUED`
- `PLANNING`
- `CODING`
- `REVIEWING`
- `VERIFYING`
- `READY_FOR_PR`

Terminal states:

- `COMPLETED`
- `STOPPED`
- `FAILED`
- `BUDGET_EXHAUSTED`

Normal flow:

1. Clone the selected base commit into a temporary sandbox.
2. Build a bounded repository map and task packet.
3. Ask FreeModel for a plan and implementation.
4. Delegate qualifying small tasks to OpenAI when connected and within budget.
5. Validate and apply patches in the sandbox.
6. Run configured checks.
7. Ask Groq to review the resulting diff.
8. Ask FreeModel to address accepted findings, for at most two correction cycles.
9. Re-run checks and ask Gemini for a final evidence-based verdict.
10. Run secret and policy scans, push the branch, and create a draft pull request.

Every transition is validated server-side. Model output cannot directly mutate workflow state.

## 10. Structured Agent Events

Agents return schema-validated events:

- `PLAN_PROPOSED`
- `PATCH_PROPOSED`
- `REVIEW_FINDING`
- `VERIFICATION_RESULT`
- `STOP_REQUEST`

A `STOP_REQUEST` contains a reason code, severity, evidence, affected files or commands, confidence, and suggested next action. The orchestrator decides whether to continue, request correction, ask the user, or enter a terminal state.

Immediate stops apply to:

- A detected secret in a proposed or applied diff.
- An attempt to access protected files or paths.
- A forbidden or unsafe sandbox command.
- Budget exhaustion.
- Explicit user cancellation.
- A confirmed repository integrity violation.

Ordinary code defects become review findings and correction work rather than immediate stops.

## 11. Sandbox Security

Each run receives an ephemeral isolated workspace with:

- A fixed CPU, memory, disk, process, and wall-clock limit.
- No model API credentials inside the sandbox.
- Network disabled by default after dependency preparation.
- An allowlisted command policy for dependency installation, formatting, linting, building, and testing.
- No deployment, package publication, privileged containers, host mounts, or arbitrary external requests.
- Output size and execution-time caps.
- Cleanup after completion or expiration.

Repository instructions may propose commands but cannot override platform safety policy. Lockfiles are honored. Dependency scripts that require network or privileged access require explicit policy approval and remain out of scope for automatic execution in the MVP.

## 12. GitHub Integration

- Use a GitHub App with least-privilege repository permissions.
- Pin every run to the selected base commit SHA.
- Create a unique `ecotokens/<run-id>` branch.
- Never write to the base branch.
- Check for base-branch drift before pushing and report conflicts rather than force-push.
- Create a draft pull request with task summary, models used, fallbacks, files changed, checks run, unresolved findings, and verification coverage.
- Leave merge approval to a human.

## 13. Credential Security

- Encrypt provider secrets using envelope encryption with a managed key-encryption key.
- Store ciphertext and non-secret metadata separately.
- Decrypt only in the provider call worker and only for the duration of a request.
- Redact keys and known secret patterns from prompts, traces, errors, and logs.
- Never expose full stored credentials back to the browser.
- Allow immediate credential deletion and rotation.
- Use separate encryption context per user and provider connection.
- Keep sandbox and GitHub operations isolated from provider credentials.

## 14. Budget and Retry Safety

No paid call starts without a cost contract derived from current configured pricing:

- Maximum calls and tokens per run.
- Maximum estimated cost per run.
- Per-provider daily hard cap or fail-closed local ledger cap.
- Concurrency limit of 2 paid calls.
- Bounded retries and idempotency key.

The product must warn at 80 percent of a run budget and reject new calls at 100 percent. Provider-side limits are configured by the user where available; OpenAI project budgets are treated as soft thresholds, so Ecotokens also enforces a fail-closed local budget ledger.

Retry rules:

- Retry timeout, connection reset, 429, and selected 5xx failures.
- Maximum two retries with jittered exponential backoff.
- Do not retry 400, 401, 403, policy rejection, validation failure, or context overflow.
- Disable hidden SDK retries where possible so retry layers do not multiply.
- Assign an idempotency key to every model step and durable workflow action.

## 15. Data Model

PostgreSQL stores:

- `users`
- `github_installations`
- `repositories`
- `provider_connections`
- `provider_model_profiles`
- `runs`
- `run_steps`
- `agent_events`
- `review_findings`
- `command_results`
- `budget_ledger_entries`
- `pull_requests`

Provider credentials are encrypted fields associated with `provider_connections`. Source trees are not persisted in PostgreSQL. Short-lived, redacted logs may be stored in object storage with automatic expiration.

## 16. Service Boundaries

- Web UI: onboarding, provider settings, repository selection, task creation, live run view, and result view.
- API service: authentication, authorization, CRUD, validation, and streaming run events.
- Orchestrator worker: deterministic workflow and state transitions.
- Provider gateway: provider adapters, model discovery, normalization, cancellation, and usage reporting.
- GitHub service: installation tokens, cloning authorization, branches, commits, and draft pull requests.
- Sandbox runner: isolated commands and artifact collection.
- Policy engine: path rules, command rules, secret scanning, diff limits, and stop decisions.
- Budget ledger: token and estimated-cost reservations, commits, refunds, and fail-closed checks.

No model provider receives GitHub credentials. No sandbox receives model credentials. Only the GitHub service can push a branch or create a pull request.

## 17. Error Handling and Degraded Operation

- Missing providers: reassign supported roles and disclose omitted independent checks.
- Invalid provider key: disable that connection and request replacement without retrying.
- Rate limit or quota: apply bounded retries, then model fallback or role degradation.
- Patch conflict: request one corrected patch; after failure, stop the affected task without corrupting the branch.
- Failed tests: permit bounded correction cycles, then create no ready PR unless the user explicitly requests a draft containing known failures.
- Sandbox timeout: terminate processes, preserve redacted evidence, and mark the step failed.
- GitHub drift: do not force-push; report that the run must be restarted or manually rebased.
- User cancellation: cancel outstanding provider requests, terminate sandbox work, and prevent subsequent state transitions.

## 18. Recommended MVP Stack

- TypeScript monorepo.
- Next.js for the web application and server endpoints.
- PostgreSQL with a type-safe ORM.
- A durable job queue backed by Redis or a managed equivalent.
- GitHub App authentication through Octokit.
- Server-Sent Events for live run updates.
- Docker-compatible ephemeral sandbox runner behind a narrow internal API.
- Zod schemas for provider responses, agent events, API inputs, and state transitions.

The implementation may substitute equivalent infrastructure when local environment constraints require it, but service boundaries and security invariants remain unchanged.

## 19. Testing Strategy

Unit tests:

- State transitions and terminal-state immutability.
- Role assignment with every provider combination.
- FreeModel ranking and fallback ordering.
- Retry classification and attempt caps.
- Budget reservation and hard-stop behavior.
- Agent event schema validation.
- Secret redaction and protected-path policy.

Integration tests:

- Mock provider adapters for success, 429, quota exhaustion, malformed output, cancellation, and context overflow.
- GitHub App branch and draft pull request flow against a test repository or mocked API.
- Sandbox command allowlist, timeout, output cap, and cleanup.
- Durable restart without duplicate billed steps.

End-to-end acceptance test:

- A new user connects GitHub and at least one provider, runs a task against a fixture repository, and receives either a verified draft pull request or a precise safe terminal result without exceeding configured limits.

## 20. Acceptance Criteria

- FreeModel is selected as primary implementer whenever a suitable FreeModel model is available.
- FreeModel quota exhaustion triggers one bounded discovery refresh and safe fallback to the next suitable candidate.
- A run works with any non-empty subset of providers and reports lost coverage.
- No agent directly applies code, invokes another agent, changes limits, or terminates a run.
- All code execution occurs in an isolated sandbox under resource and command limits.
- Every paid call is bounded by calls, tokens, estimated cost, concurrency, retries, and idempotency.
- Secrets do not appear in logs, prompts, sandbox environment, commits, or pull request content.
- Ecotokens never writes to or merges the base branch.
- The user can cancel a run and no later model or GitHub action proceeds.
- The final draft pull request records models, fallbacks, verification evidence, skipped checks, and unresolved risks.

## 21. Delivery Definition

The MVP is complete when it runs locally with documented setup, demonstrates the full fixture-repository flow using mocked providers, supports real BYOK connections through the provider adapters, and can create a real draft pull request through a configured GitHub App. Production deployment and commercial billing remain separate follow-up work.
