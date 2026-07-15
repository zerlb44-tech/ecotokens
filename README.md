# Ecotokens

Ecotokens is an open-source, BYOK-oriented coding orchestrator designed to reduce unnecessary model context while keeping budgets, state changes, verification, and GitHub writes under deterministic control.

The current `0.1.0` release is a **working mock-first MVP**. It runs the complete bounded workflow locally, produces measured token-efficiency evidence, simulates provider role degradation, and creates a local draft-PR report. It does not yet send real provider requests, store API keys, execute arbitrary repository commands, or create a real GitHub pull request.

## What Works Today

- Next.js interface for creating a bounded coding run.
- FreeModel-first role assignment with explicit degraded coverage.
- Closed state machine with immutable terminal states.
- Mandatory token and USD caps with fail-closed behavior.
- Compact-task-packet simulation and measured savings against a declared baseline.
- Mock review, verification, branch naming, and draft pull request report.
- Zod validation, security headers, unit/API tests, type checks, and production build.
- Project-level OpenCode skill that makes the Ecotokens engineering rules the default instructions for agents working in this repository.

## The 70% Target

Ecotokens targets at least **70% fewer input/context tokens** than a defined full-context baseline. This is a target, not a universal promise.

Every run reports:

- baseline tokens;
- actual task-packet tokens;
- saved tokens;
- savings percentage;
- whether the 70% target was met.

The mock MVP uses deterministic estimates so the behavior is testable. Real-provider releases must replace estimates with normalized provider usage and publish the benchmark corpus and methodology. See [Token Efficiency](docs/token-efficiency.md).

## Architecture

```text
Browser
  -> POST /api/runs (Zod validated)
  -> deterministic orchestrator
     -> role assignment
     -> hard budget gate
     -> compact packet accounting
     -> review/verification coverage
     -> draft PR report
```

The full approved architecture keeps provider credentials, sandbox execution, and GitHub credentials in separate service boundaries. Models never mutate workflow state, apply patches, invoke one another, or merge pull requests directly. See [MVP Design](docs/superpowers/specs/2026-07-15-ecotokens-mvp-design.md).

## Local Development

### Prerequisites

- Node.js 22 or newer
- npm 10 or newer

### Start

```bash
git clone https://github.com/zerlb44-tech/ecotokens.git
cd ecotokens
npm ci
npm run dev
```

Open `http://localhost:3000`.

No API keys, database, Redis, Docker, or GitHub App are required for the mock MVP.

### Verification

```bash
npm run verify
npm audit --audit-level=high
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm test` | Run the Vitest suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:e2e` | Run the browser acceptance test |
| `npm run typecheck` | Run strict TypeScript checking |
| `npm run build` | Create a production Next.js build |
| `npm run verify` | Run tests, type checks, and build |

## Project Skill

OpenCode loads [AGENTS.md](AGENTS.md) through [opencode.json](opencode.json). That file requires the repository skill at [.opencode/skills/ecotokens-engineering/SKILL.md](.opencode/skills/ecotokens-engineering/SKILL.md) before application work.

The skill enforces:

- approved spec and plan review;
- TDD for behavior changes;
- deterministic orchestration and strict agent permissions;
- token, cost, retry, concurrency, and provider caps;
- compact context packets instead of full conversation replay;
- verification before completion claims;
- untrusted treatment of external source repositories.

Restart OpenCode after cloning or changing project skill configuration so the registry reloads the local skill.

## Security Boundaries

The mock release intentionally accepts no credentials and executes no user-supplied shell commands. The real-integration roadmap requires:

- encrypted BYOK credentials with per-user/provider context;
- no provider credentials in GitHub or sandbox environments;
- no GitHub credentials in provider prompts;
- ephemeral allowlisted sandbox execution;
- secret scans before commit or PR creation;
- unique `ecotokens/<run-id>` branches;
- draft pull requests only, with human merge approval.

Read [SECURITY.md](SECURITY.md) before reporting a vulnerability.

## Roadmap

- [x] Mock-first UI, API, state machine, budgets, coverage, and token measurement.
- [ ] Encrypted provider connection storage.
- [ ] Real FreeModel OpenAI-compatible and Anthropic-compatible adapters.
- [ ] OpenAI small-task, Groq review, and Gemini verification adapters.
- [ ] Docker-compatible ephemeral sandbox behind a narrow port.
- [ ] GitHub App branch and real draft pull request integration.
- [ ] Durable PostgreSQL/Redis execution, cancellation, and SSE.
- [ ] Published real-provider benchmark corpus for the 70% target.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Changes to behavior require a failing test first. Pull requests must state security impact and token-budget impact.

## License

MIT. See [LICENSE](LICENSE).
