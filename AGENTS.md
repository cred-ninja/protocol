# Repository guidance

This public repository contains protocol specifications and conformance material.
Keep unpublished correspondence, credentials and nonpublic operational evidence
out of its files, commits, PR descriptions and review comments.

## Code Review Rules

These rules govern code review, not implementation, merge or publication approval.

### Review quality

- Report actionable security, correctness and interoperability regressions, not
  formatting preferences. Give severity, precise file/line references, a concrete
  failure or exploit scenario and remediation. Separate verified defects from
  hypotheses; inspect definitions, related normative text, vectors and consumers.
- Avoid speculation and duplicate reports of failures already identified by CI.
  Do not modify files, approve or merge as part of the review.

### Protocol and conformance

- Check consistency between normative requirements, schemas, examples and
  executable vectors. Preserve wire compatibility unless a breaking change is
  explicit and covered by eligible positive and refusal controls.
- Inspect scope attenuation, delegation ancestry, authorization, issuer/audience
  and subject/peer binding, expiry, revocation and replay behavior. No malformed
  input or verification failure should gain authority or silently become ALLOW.
- For cryptographic changes, verify algorithm/key binding, canonicalization,
  signed bytes, authenticated-encryption nonce uniqueness and tamper refusal.
  A structurally valid token is not proof of authorization or live issuance.
- Distinguish intentionally synthetic conformance tokens from real credentials
  using provenance. Never add broad fixture-directory or detector exemptions to
  silence a secret scanner, and never expose runtime tokens or private keys.
- Preserve vectors, correspondence protection and workflow-security checks. For
  scanners inspect literal Git paths, NUL boundaries, option/stdin operands,
  exporter behavior and collection/matcher failures; errors must fail closed.
- Treat dependency/tool downloads as supply-chain inputs. Preserve verified
  executable pins and real test execution; do not infer interoperability or
  live-provider acceptance from a green wrapper or source-only check.
