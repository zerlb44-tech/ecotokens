# Contributing to Ecotokens

## Before You Start

Open an issue for broad architecture, provider, credential, sandbox, or GitHub-permission changes. Small bug fixes may go directly to a pull request.

Read `AGENTS.md`, the approved design spec, and the implementation plan. External repositories are reference material only and must receive license and security review before code is copied or executed.

## Development Workflow

1. Fork and create a focused branch.
2. Write a failing test for behavior changes.
3. Implement the smallest correct change.
4. Run `npm run verify` and `npm audit --audit-level=high`.
5. Describe security, provider-cost, and token-context impact in the pull request.

## Pull Request Rules

- Keep changes scoped and avoid unrelated refactors.
- Do not commit credentials, provider responses containing secrets, or repository source fixtures without permission.
- Do not weaken hard limits, draft-only GitHub behavior, state ownership, sandbox isolation, or validation.
- New paid calls require explicit call, token, cost, retry, concurrency, and daily/provider caps.
- Performance claims require a reproducible benchmark and raw redacted evidence.
- All user-facing changes must work at mobile and desktop sizes with keyboard-visible focus.

## Commit Style

Use concise conventional prefixes when practical: `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `security:`.
