# Security Policy

## Supported Versions

Only the latest commit on `main` is supported during the pre-1.0 phase.

## Reporting

Do not open a public issue for a vulnerability. Use GitHub Private Vulnerability Reporting after the repository is published. Until it is enabled, contact the repository owner privately through their verified GitHub profile.

Include the affected commit, reproduction steps, impact, and a suggested mitigation when available. Never include live API keys, GitHub tokens, private keys, or private repository contents.

## Security Model

The current mock release stores no API keys and executes no arbitrary shell commands. Planned real integrations must preserve these invariants:

- provider credentials are encrypted and decrypted only for one provider request;
- credentials are redacted from prompts, logs, errors, commits, and PR content;
- model providers never receive GitHub credentials;
- sandboxes never receive model or GitHub credentials;
- only the GitHub service can create an `ecotokens/<run-id>` branch and draft PR;
- base branches are never force-pushed or merged automatically;
- model output is schema-validated and cannot directly mutate workflow state;
- paid calls fail closed at hard token and cost caps.
