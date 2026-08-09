# Security policy

ContextRation processes telemetry-derived metadata that may describe sensitive
agent behavior. Please report suspected vulnerabilities privately and avoid
including real trace content unless a maintainer explicitly requests a minimal,
redacted reproducer.

## Supported versions

Until the project reaches `1.0`, security fixes target the latest release and
the default branch. Older `0.x` releases may receive a coordinated fix when the
change can be backported safely, but they are not guaranteed long-term support.

| Version | Supported |
| --- | --- |
| Default branch | Yes |
| Latest `0.x` release | Yes |
| Earlier `0.x` releases | Best effort |

## Reporting a vulnerability

Use the repository's **Security → Report a vulnerability** flow to open a
private GitHub Security Advisory. Do not file a public issue or attach production
traces, prompts, credentials, or personal data.

If private vulnerability reporting is not enabled, contact the repository owner
through the private contact method on their GitHub profile and ask for a secure
reporting channel before sharing details.

Please include, where possible:

- the affected version or commit;
- impact and the trust boundary crossed;
- minimal reproduction steps using synthetic data;
- whether credentials or raw agent content were exposed;
- suggested mitigations; and
- any disclosure deadline that affects coordination.

Maintainers aim to acknowledge a report within three business days, provide an
initial triage within seven business days, and coordinate remediation and
disclosure with the reporter. Complex reports may take longer; status updates
will be provided through the private advisory.

## High-priority vulnerability classes

Examples include:

- bypassing the required success-rate or paired confidence-bound checks for a
  fully rerun combined candidate before policy promotion;
- dropping an item marked `required`;
- cross-tenant trace, report, or cache disclosure;
- raw prompt, message, retrieval, tool-result, credential, or personal-data
  leakage through logs, dashboards, fixtures, or OTel attributes;
- stored or reflected script injection through trace-controlled strings;
- unsafe deserialization, path traversal, or command execution during fixture
  processing;
- CI or release workflow paths that expose secrets to untrusted pull requests;
- dependency or artifact substitution affecting published releases; and
- denial-of-service conditions reachable with a small malicious trace.

Statistical disagreement with an evaluator or an inaccurate benchmark claim is
normally handled as a correctness issue, unless an attacker can exploit it to
bypass a documented policy or security boundary.

## Security boundaries

- ContextRation is offline-first and does not need raw context content for its
  core audit. Persisting raw content is an integrator decision and should be off
  by default.
- Trace JSON, labels, source identifiers, hashes, and evaluator outputs are
  untrusted input.
- `context.ration.*` attributes are custom metadata. They must not contain
  secrets or unbounded raw content.
- Individual ablation results are hypotheses. They cannot be combined directly
  into a production policy.
- A candidate record must represent a complete rerun. The current library
  validates declared fields but cannot independently prove run provenance,
  evaluator quality, or statistical power.
- Emitted policy is audit output, not authorization to deploy. Production
  rollout, review, canarying, and rollback remain outside the library boundary.

See [docs/security-model.md](docs/security-model.md) and
[docs/data-handling.md](docs/data-handling.md) for implementation guidance.

## Disclosure and safe harbor

We ask reporters to make a good-faith effort to avoid privacy violations,
destructive testing, service disruption, and access beyond what is necessary to
demonstrate the issue. Do not test with third-party production data without
authorization. We will not pursue action against good-faith research that
follows this policy, and we will work with reporters on coordinated disclosure.
