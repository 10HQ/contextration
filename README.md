# ContextRation

ContextRation is an OpenTelemetry-friendly context-efficiency auditor for AI
agents. It turns offline trace exports and redacted fixtures into evidence about
which context is useful, which context deserves another experiment, and which
fully rerun candidate configurations satisfy a declared quality margin.

It is an auditor, not a web crawler, prompt rewriter, or automatic production
optimizer. The safest and most reproducible workflow is offline-first: export
trace metadata, remove or hash sensitive content, run controlled ablations, and
audit the resulting JSON locally.

> [!IMPORTANT]
> An item that looks removable in an individual ablation is only a hypothesis.
> Individual effects are not additive. ContextRation emits drop actions only
> from an explicitly recorded combined candidate that was rerun end to end,
> met the required success rate, had a paired quality-loss confidence interval
> whose upper bound stayed within the non-inferiority margin, and preserved every
> item marked `required`.

## Why ContextRation

Agent traces often contain several context classes at once: system prompts,
conversation history, retrieval, tool schemas, tool results, memory, and
scratchpads. Raw token counts reveal size but not contribution. ContextRation
adds a small experiment contract around those traces so teams can:

- attribute input tokens to named context items and categories;
- record paired, one-item ablations as diagnostic evidence;
- validate combined candidates through complete reruns;
- retain failed counterfactual runs instead of hiding them;
- quantify a candidate's quality, latency, cost, and token trade-offs; and
- export compact `context.ration.*` attributes into an existing OTel pipeline.

## Current scope

The `0.1` schema and library support normalized higher-is-better quality scores,
a non-inferiority margin (`epsilon`), required context items, individual
ablation results, and fully rerun combined candidates. The included CLI reads a
JSON fixture and prints either a human-readable audit, the complete JSON report,
or OTel-friendly attributes.

ContextRation does not currently:

- receive OTLP directly or configure an OTel exporter;
- run model calls, tools, or ablations on your behalf;
- prove that an evaluator is correct or that the submitted attempts are
  statistically adequate;
- store raw prompts, messages, tool results, or retrieved documents; or
- deploy the emitted policy to a live agent.

See [Architecture](docs/architecture.md), [Benchmarking](docs/benchmarking.md),
and [OpenTelemetry integration](docs/opentelemetry.md) for the exact boundaries.

## Quick start

Prerequisite: Node.js `>=22.13.0`.

```bash
npm ci
npm run audit:demo
npm run test:unit
npm run typecheck
npm run build
```

Audit another trace:

```bash
npx tsx cli/audit.ts path/to/trace.json
npx tsx cli/audit.ts path/to/trace.json --json
npx tsx cli/audit.ts path/to/trace.json --otel
npx tsx cli/audit.ts path/to/trace.json --epsilon=0.005
```

Inputs must conform to [`benchmarks/schema.json`](benchmarks/schema.json). The
included [`examples/support-agent.json`](examples/support-agent.json) is
synthetic and safe to use as a starting fixture.

## Audit workflow

1. Capture a baseline run and attribute as much input context as possible.
2. Store metadata, counts, hashes, and source identifiers; omit raw content by
   default.
3. Rerun one-item ablations under the same evaluator and execution protocol,
   recording attempts, successes, and paired loss intervals.
4. Treat individually non-inferior removals as candidate ideas only.
5. Construct each combined candidate explicitly and rerun the complete agent
   task, including model and tool behavior.
6. Record failures and retries. Do not synthesize a combined score by adding
   individual deltas.
7. Allow a candidate to inform policy only after the complete rerun meets the
   required success rate, the upper bound of its paired `qualityLossCi95` stays
   inside `epsilon`, and required items are preserved.
8. Review the emitted policy before applying it outside the audit environment.

## Reading the report

- `attributionCoverage` is attributed context tokens divided by baseline input
  tokens. Low coverage means conclusions may ignore material context.
- `individualOpportunityTokens` and `individualOpportunityRatio` summarize
  isolated experiments. They are diagnostic opportunities, not validated
  combined removal.
- `validatedCandidate` is the token-minimal recorded combined candidate accepted
  by the current success, uncertainty, and required-item checks.
- `validatedTokenReduction` is derived only from that candidate. It is `0` when
  no combined candidate passes.
- `qualityLoss` is baseline quality minus candidate quality; smaller is better
  for the current higher-is-better schema. Candidate validation uses the upper
  bound of `qualityLossCi95`, not this point estimate alone.
- `policy.validatedCandidateId` identifies the complete candidate that supports
  every emitted `drop` action.

The library assumes candidate records represent real, complete reruns. Trace
producers remain responsible for evaluator design, repeat count, confidence
intervals, dataset integrity, and provenance. See
[Benchmarking](docs/benchmarking.md) before publishing performance claims.

## OpenTelemetry-friendly output

`toOtelAttributes(report)` returns low-volume audit attributes such as:

```text
context.ration.attribution.coverage
context.ration.evidence.status
context.ration.individual_opportunity.ratio
context.ration.validated_token_reduction
context.ration.projected_input_tokens
context.ration.quality.loss
context.ration.non_inferiority.epsilon
context.ration.non_inferiority.confidence
context.ration.candidate.validated
context.ration.candidate.id
```

These are project-specific experimental attributes, not official OpenTelemetry
semantic conventions. Your host application decides where to attach them and
must apply its own cardinality, privacy, and retention policy.

## Privacy and security defaults

- Prefer offline trace files and synthetic or redacted fixtures.
- Do not persist raw prompts, retrieved text, messages, or tool results by
  default.
- Never place provider keys, authorization headers, or session material in
  fixtures, source URIs, logs, OTel attributes, or benchmark artifacts.
- Partition any optional stored reports by tenant and authentication context.
- Treat trace JSON, labels, source strings, and dashboard text as untrusted.
- Keep policy generation separate from production policy deployment.

Read [Data handling](docs/data-handling.md) and the
[Security model](docs/security-model.md) before connecting production traces.
Report vulnerabilities through [SECURITY.md](SECURITY.md), not a public issue.

## Repository scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local application shell. |
| `npm run audit:demo` | Audit the synthetic support-agent fixture. |
| `npm run test:unit` | Run the auditor unit tests. |
| `npm run typecheck` | Check TypeScript boundaries without emitting files. |
| `npm run build` | Build the application. |
| `npm test` | Run unit tests, build, and rendered-output verification. |
| `npm run lint` | Run ESLint. |

## Project governance

Contributions are welcome under [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md). Benchmark changes require reproducible
fixtures and may not turn isolated ablations into a production recommendation.
Repository and release controls are documented in
[Repository governance](docs/repository-governance.md).

ContextRation is licensed under the [Apache License 2.0](LICENSE).
