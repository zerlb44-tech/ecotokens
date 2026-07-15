# Token Efficiency Methodology

## Claim Policy

Ecotokens uses `70% token savings` as an engineering target. Documentation and UI must not present it as guaranteed production performance.

## Measurement

For a fixed task and repository snapshot:

```text
savings_percent = round((baseline_tokens - actual_tokens) / baseline_tokens * 100)
```

- `baseline_tokens`: tokens that would be sent by a declared full-context strategy.
- `actual_tokens`: normalized input/context tokens sent by Ecotokens task packets.
- `saved_tokens`: `max(0, baseline_tokens - actual_tokens)`.
- `target_met`: `savings_percent >= 70`.

The baseline must include the same task and repository snapshot. It must document file-selection rules, model tokenizer, retries, correction cycles, and cached-token treatment.

## Current MVP

Version `0.1.0` uses deterministic simulation values to test accounting, UI disclosure, and budget gates. These values are not evidence that real providers will save the same percentage.

## Production Benchmark Requirements

Before making a public performance claim based on real providers, publish:

1. A versioned fixture corpus covering multiple languages and repository sizes.
2. A reproducible full-context baseline implementation.
3. Provider/model/tokenizer versions and dates.
4. Median, p25, p75, and worst-case savings.
5. Task success, build, test, and review-quality results alongside savings.
6. Retry and fallback token usage.
7. Raw redacted result artifacts.

A run that saves tokens but fails the task does not count as a successful efficiency result.

## Techniques

- bounded repository maps;
- structural or symbol search before full-file reads;
- compact fallback packets containing task, accepted plan, diff, evidence, findings, and remaining budget;
- summarized tool output with raw artifacts kept outside model context;
- role-specific prompts rather than replaying one shared conversation;
- hard output limits and bounded correction cycles.
