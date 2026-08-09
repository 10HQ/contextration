# Benchmarking and metric definitions

ContextRation benchmarks should answer a narrow question: under a fixed agent
task and evaluator, did a completely rerun candidate reduce context while its
paired quality loss remained within a declared non-inferiority margin?

A dashboard must show success, quality, uncertainty, and failures next to token,
latency, and cost results. A single “efficiency score” or “faster by X” headline
is insufficient.

## Experimental unit

A benchmark case contains:

- one baseline configuration;
- stable context-item attribution;
- optional one-item ablation experiments;
- zero or more explicit combined candidate configurations;
- paired observations under a named evaluator; and
- a manifest describing code, model, data, tokenizer, and execution protocol.

Baseline and candidate observations should use the same cases, evaluator,
model revision, tool fixtures, sampling parameters, timeout, retry policy, and
cache state. Pairing must be preserved when calculating quality loss.

## Quality loss and non-inferiority

The schema assumes normalized higher-is-better quality.

```text
quality loss = baseline quality - candidate quality
```

A positive value means the candidate scored worse. `qualityLossCi95` is the 95%
confidence interval for paired quality loss, not for candidate quality alone.
The candidate passes the statistical policy only when the interval exists and:

```text
upper(qualityLossCi95) <= epsilon
```

The report's point `qualityLoss` remains useful for description, but policy
validation uses the upper confidence bound. The manifest must name the interval
estimator and explain how failed or missing pairs are handled.

## Individual versus combined experiments

An individual ablation removes one item while holding the rest of the baseline
configuration constant. It can reveal an opportunity for further study.

Several individual ablations cannot be combined by:

- summing or averaging quality losses;
- taking the union of `experiment-candidate` items;
- assuming token, latency, or cost changes are independent; or
- reusing one item's confidence interval for a multi-item policy.

Every proposed combination must become an explicit candidate and be rerun end
to end. Only that complete candidate's paired evidence may support policy.

## Report metrics

| Metric | Definition | Interpretation |
| --- | --- | --- |
| `attributionCoverage` | Sum of attributed context-item tokens / baseline input tokens | Coverage of the input accounting. Below 95% should be reported as a warning. |
| `individualOpportunityTokens` | Sum of tokens for non-required items whose individual experiment meets its configured criterion | Diagnostic search space only; not validated combined savings. |
| `individualOpportunityRatio` | `individualOpportunityTokens` / attributed context tokens | Isolated opportunity density, not a deployment claim. |
| `validatedTokenReduction` | `1 - selected candidate input tokens / baseline input tokens` | Reduction supported by one eligible complete candidate; zero if none passes. |
| `qualityLoss` | Baseline quality - selected candidate quality | Point estimate. Policy validity uses the CI upper bound. |
| `projectedInputTokens` | Selected candidate input tokens, otherwise baseline input tokens | Recorded candidate measurement when eligible; baseline fallback otherwise. |
| `projectedCostUsd` | Selected candidate cost, otherwise baseline cost | Input-supplied estimate or measurement; disclose methodology. |
| `projectedCostReductionUsd` | Baseline cost - selected candidate cost | Projection based on supplied prices; may be negative and is not guaranteed future savings. |
| `paybackRuns` | `ceil(audit cost / savings per run)` when savings are positive | Break-even projection; null when not reached. |

Do not rename `individualOpportunityRatio` to “removable ratio” or
`validatedTokenReduction` to “guaranteed savings.” Evaluator drift, workload
change, pricing, and production behavior remain external risks.

## Mandatory benchmark views

Published results should include:

1. baseline and candidate success rate, including failed attempts in the
   denominator;
2. quality point estimates and paired confidence intervals;
3. baseline and candidate input/output tokens;
4. end-to-end latency p50/p95/p99 and sample count;
5. cost per attempted run and cost per successful run;
6. attribution coverage;
7. individual opportunity metrics, visually separated from validated reduction;
8. selected candidate ID and exact removed item IDs; and
9. failure categories, retries, timeouts, and exclusions.

Do not add percentiles from separate stages. If stage timing is shown, report
each stage independently and also report directly measured end-to-end latency.

## Reproducibility manifest

Record at least:

- repository commit and schema version;
- fixture/dataset ID, version, hash, and redistribution status;
- model provider, model revision, and sampling parameters;
- evaluator name, version, rubric, direction, and `epsilon`;
- tokenizer name and version;
- repeat count, pairing key, interval estimator, and random seed policy;
- concurrency, timeout, retry behavior, cache mode, and warmup behavior;
- runtime, operating system, region, and execution timestamp; and
- every planned exclusion and failure category.

Use [`benchmarks/manifest.schema.json`](../benchmarks/manifest.schema.json) as a
portable minimum. Store raw per-pair observations in an access-appropriate
artifact when auditability matters; aggregate JSON alone cannot prove the
interval calculation.

## Candidate promotion gate

Before a candidate can become an emitted policy:

- [ ] The combined configuration was rerun end to end.
- [ ] All planned repetitions, including failures, are represented.
- [ ] The candidate succeeded under the declared success definition.
- [ ] `qualityLossCi95` was computed from paired observations.
- [ ] Its upper bound is no greater than `epsilon`.
- [ ] No required item is removed.
- [ ] Fixture, model, evaluator, tokenizer, and code versions are recorded.
- [ ] A reviewer confirms the candidate was not synthesized from individual
      ablations.

Production deployment requires a separate review, canary, monitoring, and
rollback decision.

## Claim template

Prefer a reproducible statement such as:

> On dataset D at commit C, candidate K completed N paired reruns, reduced input
> tokens by R, and had paired quality loss L with 95% CI [A, B], where B was no
> greater than epsilon E. Success rate was S and p50/p95 latency was X/Y.

Avoid “safe,” “guaranteed,” “zero impact,” or “X times more efficient” unless
those terms have a separately defined and validated meaning.
