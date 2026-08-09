# Repository governance

ContextRation is an evidence-oriented project. Repository controls should make
changes to audit semantics, security boundaries, and benchmark claims easier to
review than ordinary presentation changes.

## Roles

- **Maintainers** review code, documentation, releases, and community reports.
- **Security maintainers** handle private vulnerability reports and approve
  changes to ingestion, persistence, rendering, policy promotion, CI, and
  release workflows.
- **Benchmark reviewers** verify metric definitions, manifests, fixture rights,
  paired intervals, and the separation between individual opportunity and
  validated candidate evidence.

One person may fill several roles while the project is small, but a contributor
should not be the only approver of their own security- or benchmark-sensitive
change.

## Merge policy

Protect the default branch with a repository ruleset that requires:

- pull requests rather than direct pushes;
- at least one approving review;
- dismissal of stale approvals after material changes;
- passing CI, unit tests, and build checks;
- resolved review conversations;
- no force pushes or branch deletion; and
- a code-owner review for audit, benchmark, security, and workflow changes.

The current [CODEOWNERS](../.github/CODEOWNERS) file uses the repository
maintainer identity configured for this project. Update it if the repository is
transferred or dedicated teams are created. It covers at least:

```text
/lib/**                       @maintainer
/benchmarks/**                @benchmark-reviewer
/docs/security-model.md       @security-reviewer
/SECURITY.md                  @security-reviewer
/.github/**                   @security-reviewer
```

## Required repository settings

- Enable private vulnerability reporting.
- Enable secret scanning and push protection.
- Enable Dependabot alerts and security updates.
- Enable CodeQL default setup for supported languages.
- Restrict GitHub Actions to required publishers and pin action references to
  full commit SHAs.
- Give `GITHUB_TOKEN` read-only permissions by default.
- Require approval before workflows from first-time contributors run.
- Do not expose organization secrets to fork pull requests.

Settings are not represented completely by repository files; maintainers should
verify them before every public release.

## Benchmark governance

A result-changing pull request must include the fixture or manifest needed to
reproduce it. Reviewers must reject claims that:

- combine isolated ablation effects without a complete candidate rerun;
- omit failures, retries, sample count, or uncertainty;
- rename individual opportunity as validated savings;
- compare different datasets or execution conditions without disclosure; or
- include unlicensed or sensitive raw content.

Changing the sign, denominator, eligibility rule, or statistical meaning of a
metric requires a new schema version or explicit migration.

## Releases

Before tagging a release:

1. run `npm ci`, `npm run test:unit`, and `npm run build` from a clean checkout;
2. review dependency and code-scanning alerts;
3. confirm public fixtures are synthetic or redistributable;
4. verify documentation matches the runtime field names and policy gate;
5. generate an SBOM and build-provenance attestation for distributed artifacts;
6. publish checksums and immutable release assets where supported; and
7. record known limitations and security fixes in release notes.

No release process should automatically apply a benchmark candidate to a live
agent policy.

## Decision records

Use a pull request or a future `docs/decisions/` record for changes to schema,
metric semantics, evaluator assumptions, security boundaries, or governance.
The record should explain rejected alternatives and migration impact.
