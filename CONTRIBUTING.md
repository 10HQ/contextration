# Contributing to ContextRation

Thank you for improving ContextRation. Contributions should preserve its core
contract: audit evidence is offline-first, individual ablations are diagnostic,
and only complete combined reruns can support an emitted policy.

By submitting a contribution, you agree that it may be distributed under the
Apache License 2.0 used by this repository.

## Before you start

- Read the [architecture](docs/architecture.md),
  [security model](docs/security-model.md), and
  [benchmark protocol](docs/benchmarking.md).
- Search existing issues before proposing a duplicate change.
- Report vulnerabilities privately according to [SECURITY.md](SECURITY.md).
- Do not include customer data, production prompts, access tokens, proprietary
  documents, or raw production traces in issues, pull requests, or fixtures.

## Development setup

ContextRation requires Node.js `>=22.13.0`.

```bash
npm ci
npm run test:unit
npm run typecheck
npm run lint
npm run build
```

Useful commands are documented in [README.md](README.md). Keep dependency
changes in `package.json` and `package-lock.json` together.

## Pull requests

A focused pull request should include:

1. a concise problem statement and the intended boundary of the change;
2. tests for changed behavior, including failures and edge cases;
3. documentation and schema updates when contracts change;
4. benchmark evidence for claims about quality, tokens, latency, or cost; and
5. a note about privacy, security, and backward compatibility impact.

Do not mix unrelated refactors with a behavior change. Maintainers may ask for
smaller commits or a design discussion before merging a new schema or policy
rule.

## Trace and benchmark contributions

Fixtures must be synthetic, generated for the project, or demonstrably licensed
for redistribution. Redaction is not optional when a trace could contain user
messages, retrieved content, tool results, identifiers, or credentials.

Every benchmark contribution must:

- declare the model, evaluator, tokenizer, execution protocol, repeat count,
  timeout, retry behavior, and cache state;
- preserve failed runs in the recorded denominator;
- keep baseline and candidate conditions comparable;
- provide the complete combined rerun for every policy candidate;
- avoid calculating a combined candidate by summing individual ablation deltas;
- publish sample count and uncertainty when making comparative claims; and
- distinguish measured results from projections or vendor-reported numbers.

An individual ablation may set `recommendation: "experiment-candidate"`; it may
not directly create a `drop` action. Only a fully rerun candidate that meets the
required success rate, passes the paired confidence-bound check, and preserves
required items can do that.

## Schema changes

The current input contract is versioned as `0.1` in
[`benchmarks/schema.json`](benchmarks/schema.json). A schema change must update:

- TypeScript types and runtime validation;
- JSON Schema and fixtures;
- unit tests and CLI help where applicable;
- architecture, data-handling, and benchmark documentation; and
- migration notes when existing fixtures would stop validating.

Do not silently reinterpret an existing metric. Add a new version or field when
the denominator, unit, sign, or eligibility rule changes.

## Security-sensitive changes

Changes involving trace ingestion, source identifiers, raw content, policy
promotion, dashboard rendering, OTel export, authentication, storage, or CI
permissions require explicit security review. Add negative tests for malformed
JSON, injection-shaped labels and sources, tenant mixing, secret leakage, and
policy promotion without a valid combined candidate as relevant.

## Documentation style

Prefer exact definitions over marketing language. State whether a value is
measured or projected, define its denominator, and name any evaluator or
confidence assumption. Avoid describing individually removable tokens as safe
combined savings.

## Community

Participation is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
