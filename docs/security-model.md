# Security model

ContextRation audits metadata derived from AI-agent executions. Its main risk is
not browser isolation or crawling; it is turning incomplete, manipulated, or
sensitive trace evidence into an apparently authoritative optimization policy.

## Assets

- Agent prompts, messages, retrieved content, memories, and tool results
- Provider credentials, authorization headers, and session material
- Evaluator inputs and scores
- Trace and tenant identifiers
- Candidate experiment records and confidence intervals
- Emitted policy and production rollout authority
- Benchmark results and project release artifacts

## Trust assumptions

The local process, audited library build, and configured policy approver are
trusted. The following are untrusted until validated:

- JSON traces and fixtures;
- all trace-controlled strings, including labels and source identifiers;
- OTel attributes received from another service;
- evaluator output and experiment provenance;
- rendered dashboard content;
- repository contributions and CI artifacts from forks; and
- third-party dependencies and GitHub Actions.

## Required security invariants

### Offline and metadata first

The core audit must work from metadata, token counts, hashes, scores, and source
references. Raw prompts, messages, documents, and tool results should not be
captured or persisted by default. An integration that retains them creates a new
data store and must supply its own authorization, tenant isolation, encryption,
retention, deletion, and incident-response controls.

### Trace input is hostile

Parse JSON as data only. Enforce body and field-size limits before validation.
Reject duplicate IDs, unknown schema versions, non-finite numbers, impossible
token accounting, malformed intervals, and candidate references to unknown
items. Escape labels and source strings in terminals and UIs; never render them
as raw HTML or interpolate them into shell commands, file paths, SQL, or code.

### Individual ablations never become a combined policy

An isolated ablation reveals a local opportunity under one intervention. It
does not prove that several removals are safe together. Interactions can change
model behavior, tool selection, retrieval dependence, and evaluator variance.

The auditor must never union individual recommendations, sum their quality
deltas, or label `individualOpportunityTokens` as validated savings.

### Candidate evidence is complete and uncertainty-aware

A candidate may back policy only if it is the result of a complete rerun of the
combined configuration. Its run must succeed, preserve required items, and have
a paired quality-loss confidence interval whose upper bound is no greater than
the configured non-inferiority margin.

`qualityLossCi95` means a confidence interval for
`baseline quality - candidate quality` computed from paired observations. It is
not an interval around the candidate's standalone quality. Missing or malformed
paired evidence is not validated evidence.

The library can validate the declared interval but cannot prove its provenance.
High-impact deployments should bind raw run IDs, evaluator version, dataset
hash, code revision, model revision, and experiment manifest to a signed or
immutable record.

### Policy output is not deployment authority

Policy generation and policy application must be separate permissions. A
report may recommend a candidate; only a reviewed rollout system may apply it.
Use canaries, bounded exposure, online guardrail metrics, and an immediate
rollback path. Never let an OTel attribute directly mutate a production prompt.

### Telemetry is a possible exfiltration channel

Do not export raw content, credentials, source query strings, full user IDs, or
unbounded labels as attributes. OTel backends often have broad readership and
long retention. Hash or map high-cardinality identifiers, cap label lengths,
and allowlist exported keys.

### Tenant boundaries survive caching and storage

If an integration adds persistence, cache keys must include tenant and
authorization context. Reports, fixtures, manifests, and policy approvals must
be access-controlled independently. A result from one tenant must never be
reused to optimize another tenant merely because a trace name or model matches.

## Abuse and failure cases

| Threat | Required mitigation |
| --- | --- |
| Forged candidate claims a rerun that never happened | Signed/immutable experiment manifest, run IDs, reviewer approval; treat input provenance as external responsibility. |
| Candidate hides failed attempts | Retain every attempt; define the denominator before execution; reject selectively reported aggregates. |
| Confidence interval uses unpaired samples or wrong sign | Define `qualityLossCi95` as paired baseline-minus-candidate loss; validate ordering and document the estimator. |
| Trace label injects script into dashboard | Encode output, sanitize Markdown, apply CSP, prohibit raw HTML. |
| Source URI leaks a token | Remove query/userinfo, hash sensitive identifiers, scan fixtures and telemetry for secrets. |
| Oversized trace exhausts memory | Set request, array, string, and numeric limits before full processing. |
| Cross-tenant report reuse | Tenant-scoped storage and cache keys; authorization on every read and write. |
| CI from a fork extracts secrets | Read-only token, no secrets on fork workflows, avoid privileged checkout, pin actions to full commit SHAs. |
| Compromised dependency alters audit policy | Lockfile, dependency review, Dependabot, code scanning, signed releases, SBOM and provenance. |

## Secure deployment checklist

- [ ] Raw content persistence is disabled by default.
- [ ] Trace and output size limits are enforced before rendering or storage.
- [ ] Candidate records are complete combined reruns, not synthesized unions.
- [ ] `qualityLossCi95` is paired, correctly signed, and its upper bound is
      required to pass `epsilon`.
- [ ] Required items cannot be removed.
- [ ] Policy creation and production deployment require different authority.
- [ ] OTel export uses an attribute allowlist and privacy review.
- [ ] Dashboard values are encoded and a restrictive CSP is present.
- [ ] Optional persistence is tenant-scoped, encrypted, expiring, and deletable.
- [ ] Security tests cover malformed intervals, failed runs, injected strings,
      required-item removal, and policy creation without a validated candidate.
- [ ] CI does not expose secrets to untrusted pull requests.

Report vulnerabilities using the private process in
[`SECURITY.md`](../SECURITY.md).
