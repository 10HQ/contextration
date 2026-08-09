# Architecture

ContextRation is a small audit core surrounded by adapters. Its primary input is
an offline JSON trace or fixture; its primary outputs are an audit report, a
candidate-backed policy, and optional OTel-friendly attributes.

```text
OTel export / redacted fixture / experiment runner
                         |
                         v
               ContextTrace JSON adapter
                         |
                         v
                validation and attribution
                         |
             +-----------+-----------+
             |                       |
             v                       v
   individual ablation audit   combined candidate audit
   (opportunity discovery)     (complete paired reruns)
             |                       |
             +-----------+-----------+
                         |
                         v
            report + candidate-backed policy
                         |
                         v
             custom OTel attributes / UI
```

## Components

### Trace producer

The producer lives outside ContextRation. It exports an agent baseline, context
item metadata, individual ablation observations, and combined candidate runs.
It is responsible for model calls, tool execution, evaluator behavior, repeat
count, paired loss calculations, and provenance.

The preferred producer is an offline trace-export or fixture-building process.
ContextRation does not require an agent to run inside the application and does
not require raw prompt or tool-result content.

### Schema and validation

`ContextTrace` schema version `0.1` defines:

- a normalized, higher-is-better evaluator;
- baseline quality, success, token, latency, and cost metrics;
- attributed context items and protected `required` items;
- optional one-item ablation results; and
- explicitly enumerated combined candidate reruns.

The JSON contract is published at
[`benchmarks/schema.json`](../benchmarks/schema.json). Runtime validation rejects
unsupported schema versions, duplicate item IDs, invalid token counts,
over-attribution, and candidates referencing unknown items.

### Individual audit

Individual ablations help identify where another experiment may be worthwhile.
They produce an opportunity count and per-item recommendations. They do not
authorize removal because context items can interact nonlinearly.

No code path may create a combined policy by taking the union of individually
non-inferior items or by adding their measured quality effects.

### Candidate audit

A candidate is an explicit set of item IDs removed together and a record of the
complete agent rerun under that configuration. A candidate is eligible to back
a policy only when:

1. the complete candidate run succeeded;
2. its paired quality-loss confidence interval is present;
3. the upper bound of `qualityLossCi95` is less than or equal to `epsilon`; and
4. it removes no item marked `required`.

Among eligible records, the auditor prefers the candidate with the smallest
input-token count, then higher measured quality, then lower latency. This is a
selection rule over submitted evidence, not a search over untested combinations.

### Report and policy

The report separates two concepts:

- `individualOpportunityTokens` and `individualOpportunityRatio` describe the
  scale of isolated hypotheses; and
- `validatedTokenReduction` describes only the selected complete candidate.

Every emitted `drop` action cites `policy.validatedCandidateId`. If no candidate
passes, the validated reduction is zero and all items remain `keep`.

The policy is an audit artifact. ContextRation does not deploy it. Production
approval, rollout, canarying, monitoring, and rollback belong to the integrating
system.

### OpenTelemetry adapter

`toOtelAttributes()` converts report fields into compact
`context.ration.*` attributes. It is exporter-agnostic and does not receive OTLP
or configure an SDK. The namespace is experimental and project-specific, not an
official OpenTelemetry semantic convention.

## Trust boundaries

The trace, labels, source identifiers, hashes, evaluator scores, confidence
intervals, and candidate declarations are untrusted input. The core verifies
structural invariants, but it cannot independently prove that an experiment ran,
that samples were paired correctly, or that an evaluator measures the desired
behavior. Signed manifests, immutable raw experiment records, and reviewer
approval belong around the core when policy decisions are high impact.

See [Security model](security-model.md) and
[Benchmarking](benchmarking.md) for those controls.
