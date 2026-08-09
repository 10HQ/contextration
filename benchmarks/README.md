# ContextRation benchmark artifacts

This directory defines portable contracts for ContextRation experiments. It is
not a leaderboard and should not contain raw production context.

- [`schema.json`](schema.json) validates a `ContextTrace` audit input.
- [`manifest.schema.json`](manifest.schema.json) defines the minimum provenance
  needed for a reproducible published run.
- [`../examples/support-agent.json`](../examples/support-agent.json) is a
  synthetic demonstration fixture.

## Run a fixture

```bash
npx tsx cli/audit.ts examples/support-agent.json
npx tsx cli/audit.ts examples/support-agent.json --json
npx tsx cli/audit.ts examples/support-agent.json --otel
```

The CLI performs runtime validation in addition to JSON Schema. Runtime checks
cover cross-field invariants that JSON Schema cannot express conveniently,
including success counts, unique positions, attributed-token totals, exact
candidate token arithmetic, and confidence intervals containing the observed
paired loss.

## Fixture policy

Public fixtures must be synthetic, explicitly redistributable, or stripped of
protected content before they enter Git history. The `0.1` trace schema contains
metadata and hashes, not raw prompt, message, retrieval, memory, or tool-result
content.

Set `syntheticDemo: true` only for intentionally illustrative data. Synthetic
results must not be presented as measured production performance.

## Experiment rule

An individual ablation may reveal an `experiment-candidate`. Its token count and
effect cannot be combined with other isolated results. Every multi-item removal
must be recorded as a candidate produced by a complete end-to-end rerun.

A candidate remains inconclusive unless it meets the required success rate and
includes a paired `qualityLossCi95` whose upper bound is no greater than
`evaluator.epsilon`. Required items can never be removed.

See [`../docs/benchmarking.md`](../docs/benchmarking.md) for metric definitions,
the paired confidence-interval contract, failure denominators, and the reporting
checklist.
