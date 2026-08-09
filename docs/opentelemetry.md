# OpenTelemetry integration

ContextRation is OTel-friendly rather than an OTLP receiver or exporter. The
core accepts its own versioned trace JSON and exposes a small map of custom
attributes that a host application may attach to an existing span, event, or
metric.

## Custom namespace

The current adapter emits project-specific experimental attributes:

| Attribute | Type | Meaning |
| --- | --- | --- |
| `context.ration.schema.version` | string | ContextRation audit schema version. |
| `context.ration.trace.id` | string | Input audit trace ID; consider hashing or omitting before external export. |
| `context.ration.evidence.status` | string | `validated` when a complete candidate passes, otherwise `inconclusive`. |
| `context.ration.attribution.coverage` | number | Attributed input-token coverage. |
| `context.ration.individual_opportunity.ratio` | number | Ratio derived from isolated experiments; not validated combined reduction. |
| `context.ration.validated_token_reduction` | number | Reduction supported by the selected complete candidate. |
| `context.ration.projected_input_tokens` | number | Candidate input tokens, or baseline when none passes. |
| `context.ration.quality.loss` | number | Baseline-minus-candidate point quality loss. |
| `context.ration.non_inferiority.epsilon` | number | Configured maximum tolerated quality loss. |
| `context.ration.non_inferiority.confidence` | number | Confidence level used by schema `0.1`; currently `0.95`. |
| `context.ration.candidate.validated` | boolean | Whether a complete candidate passed the validation gate. |
| `context.ration.candidate.id` | string | Selected candidate ID or `none`; control cardinality before export. |

These names are not official OpenTelemetry semantic conventions and may evolve
before `1.0`. Pin the ContextRation version and treat changes as an integration
contract.

## Recommended attachment

Attach audit attributes to a dedicated offline audit span or event rather than
every production model invocation. That keeps cost and cardinality bounded and
makes it clear that values summarize an experiment rather than live behavior.

```ts
import { auditTrace, toOtelAttributes } from "./lib/contextration/index";

const report = auditTrace(redactedTrace);
const attributes = toOtelAttributes(report);

// Host application responsibility:
// auditSpan.setAttributes(filterAndBound(attributes));
```

The host must provide `filterAndBound`, the OTel SDK, exporter configuration,
authentication, sampling, and backend retention.

## Privacy and cardinality

- Never export raw prompts, messages, retrieved text, tool inputs/results,
  credentials, or source URIs.
- Consider hashing or dropping `trace.id` and `candidate.id` in shared backends.
- Bound string lengths and reject control characters before dashboard display.
- Keep labels, source identifiers, and per-item IDs out of metric dimensions.
- Use logs or access-controlled artifacts for detailed per-item evidence rather
  than high-cardinality metrics.
- Document whether cost values are measured, estimated, or derived from a price
  table.

## Mapping from existing OTel data

An adapter may derive a `ContextTrace` from GenAI spans, but the mapping is not
automatic in the current repository. A robust adapter should:

1. recognize only allowlisted span/event schemas;
2. count tokens with a named tokenizer or use provider-reported counts with
   provenance;
3. map context items to pseudonymous stable IDs;
4. avoid copying span bodies or exception messages that contain content;
5. preserve baseline/candidate pairing keys outside public telemetry; and
6. write a redacted fixture for offline audit.

Do not infer a full combined candidate from unrelated production spans. A
candidate must be an intentional, complete rerun under the benchmark protocol.
