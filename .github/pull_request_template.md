## Summary

Describe the problem and the smallest change that solves it.

## Verification

- [ ] `npm ci`
- [ ] `npm run test:unit`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Added or updated tests for changed behavior
- [ ] Updated schemas and documentation when contracts changed

## Evidence and benchmark integrity

- [ ] No performance claim omits failures, sample count, protocol, or uncertainty
- [ ] Individual ablations remain opportunity signals only
- [ ] Every policy candidate is backed by a complete combined rerun
- [ ] `qualityLossCi95` is paired baseline-minus-candidate loss, not a standalone quality interval
- [ ] Synthetic demonstrations are labeled `syntheticDemo: true`

## Privacy and security

- [ ] No raw production prompts, messages, retrieval, tool results, credentials, personal data, or proprietary content are included
- [ ] Raw-content persistence remains disabled by default
- [ ] Trace-controlled text is treated as untrusted at rendering and export boundaries
- [ ] CI changes use least privilege and do not expose secrets to fork pull requests

## Compatibility

Describe schema, API, OTel attribute, fixture, and migration impact. Write “none” only after checking each area.
