# Data handling

ContextRation is designed so that an audit can be reproduced from structured
metadata without storing the underlying agent context. Integrations should keep
that property unless a documented use case justifies additional collection.

## Data classes

| Class | Examples | Default treatment |
| --- | --- | --- |
| Aggregate metrics | Token counts, normalized quality, latency, cost, success | Allowed in offline fixtures after tenant and user identifiers are removed. |
| Experiment metadata | Model name, evaluator, repeat count, epsilon, run time | Retain only as long as needed for reproducibility and policy review. |
| Context metadata | Category, position, required flag, stable item ID | Prefer pseudonymous IDs and bounded labels. |
| Source reference | `prompt://`, `trace://`, `tool://`, URL, content hash | Remove credentials, userinfo, and query strings; hash when possible. |
| Raw context | Prompts, messages, retrieved documents, memory, tool arguments/results | Do not collect or persist by default. |
| Credentials | API keys, cookies, bearer tokens, auth headers | Prohibited in traces, fixtures, logs, metrics, and repository content. |
| Personal or regulated data | Names, emails, account data, health or financial data | Remove before export unless an approved, access-controlled process requires it. |

## Offline-first flow

1. Export or derive trace metadata inside the environment that already holds the
   agent execution.
2. Replace sensitive item IDs and source references with scoped pseudonyms.
3. Hash content locally if correlation is necessary. A hash is still potentially
   identifying and should not be treated as anonymous automatically.
4. Write a fixture conforming to `benchmarks/schema.json` without raw content.
5. Run ContextRation locally or in an isolated CI job.
6. Persist the minimal report and manifest needed for review; delete temporary
   exports according to the source system's policy.

## Raw content

The `0.1` schema intentionally has no raw-content field. Do not work around that
by placing prompts or documents in `label`, `source`, IDs, or custom OTel
attributes. If an integration adds a separate content store, it must be opt-in
and must define:

- collection purpose and lawful basis where applicable;
- allowed content classes and field-level redaction;
- tenant and user authorization;
- encryption in transit and at rest;
- cache partitioning;
- retention and deletion deadlines;
- access audit logs; and
- incident response and breach notification ownership.

The core report should reference such content only through a scoped identifier
or hash. Deleting the external content should not break interpretation of the
aggregate audit.

## OpenTelemetry export

`toOtelAttributes()` returns custom attributes for integration into an existing
OTel span, event, or metric pipeline. Before export:

- allowlist attribute names;
- bound string length and cardinality;
- consider hashing or omitting trace and candidate IDs;
- do not copy `label` or `source` into attributes;
- do not export raw evaluator inputs or per-user identifiers; and
- align backend retention with the sensitivity of experiment metadata.

OTel-friendly does not mean safe for unrestricted telemetry. Collector,
processor, backend, and dashboard access controls remain the operator's
responsibility.

## Fixtures and benchmark artifacts

Public fixtures must be synthetic, explicitly licensed for redistribution, or
irreversibly transformed so that they disclose no protected content. Redaction
must be performed before a pull request is opened. Do not rely on deleting a
secret in a later commit; Git history and CI artifacts may retain it.

A public benchmark should contain the structured trace, an experiment manifest,
hashes, and result summaries. It should not contain production prompt text,
customer conversations, retrieved proprietary documents, or tool payloads.

## Retention guidance

- Temporary raw export: delete immediately after redaction and fixture creation.
- Redacted fixture: retain only while it supports a reproducible benchmark or
  active policy decision.
- Audit report: retain according to the policy review and rollback window.
- OTel attributes: use the shortest backend retention that meets the operational
  need.
- Policy evidence: retain the manifest and aggregate results for as long as the
  policy is active, then follow the organization's audit schedule.

These are defaults, not a substitute for an organization's legal, privacy, or
records-management requirements.
