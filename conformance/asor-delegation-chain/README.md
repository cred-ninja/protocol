# Conformance: draft-asor-wimse-agent-delegation-chain-00 Appendix B vectors

Runs the interop vectors published with [draft-asor-wimse-agent-delegation-chain-00](https://datatracker.ietf.org/doc/draft-asor-wimse-agent-delegation-chain/) through Cred's shipping delegation chain logic and prints a pass/fail/gap matrix.

## Vectors

The twenty files in `vectors/` are copied verbatim from [attenu-io/attenu-guard](https://github.com/attenu-io/attenu-guard) at tag `v0.9.0` (commit `33050ac`), path `tests/vectors/`. They are not fetched at test time. To refresh them, copy the files from a newer tag/commit and update the pin here.

(Previously pinned to commit `4cfe7ccbe28671289234ebfde1cb5ece90d6da8f`, the original 7-vector set.)

Each file holds one root-first chain of HS256 Delegation Tokens signed with a published interop secret, the `now` to evaluate at, and either `"expect": "accept"` or an `"expect_reject_reason"`. See the attenu-guard `tests/vectors/README.md` for the file format.

## Running

Needs Node 20 (the version sdk CI uses) and `tsx`.

From a clean machine, clone both repos as siblings and install the sdk workspace first. The sdk install matters: the vault entry point pulls in packages with native dependencies (better-sqlite3), so the runner fails on module resolution without it.

```
git clone https://github.com/cred-ninja/protocol.git
git clone https://github.com/cred-ninja/sdk.git
cd sdk && npm ci && cd ..
cd protocol/conformance/asor-delegation-chain
npm install
npx tsx run.ts --sdk ../../../sdk
```

Pass `--sdk` explicitly. Without it the runner falls back to `CRED_SDK_PATH`, a sibling checkout, then an installed `@credninja/vault` from npm, and the npm package lags the source tree this runner is meant to test.

Cred code is resolved from, in order: `--sdk PATH`, `$CRED_SDK_PATH`, a sibling checkout at `../../../sdk`, then an installed `@credninja/vault`. The first two point at a source checkout and use `packages/vault/src` directly, so no build step is needed.

Flags: `--vectors DIR` to point at another vector directory, `--allow-gaps` to exit zero when only GAP rows are present, `--json` for machine output.

Exit code is nonzero on any FAIL. GAP rows also fail the run unless `--allow-gaps` is passed.

## What is under test

- `verifyDelegationChain()` from `@credninja/vault`: per-hop signature result and expiry, depth stepping from the root, maximum depth, parent commitment linkage, wildcard-aware scope subsumption, and expiry monotonicity.
- `validateSubDelegation()` from `@credninja/vault`, called per hop the way `POST /api/v1/subdelegate` calls it.

The runner does two things itself because the vectors are in the draft's encoding rather than Cred's: it checks the HS256 signature with the published secret (Cred receipts are Ed25519; same JWS structure, different primitive) and it computes each hop's commitment hash the way the draft defines it, base64url SHA-256 over the JWS Signing Input, so the child's `par_hash` can be compared. `verifyDelegationChain()` only compares the two hash strings it is given, so the linkage code path is the same one `verifyReceiptChain()` uses for native Cred receipts, which commit to SHA-256 hex over the full compact receipt.

Claim mapping: `sub` to agentDid, `jti` to delegationId, `del_depth` to chainDepth, root `del_max_depth - 1` to maxDepth (the draft bounds leaf depth strictly below `del_max_depth`; Cred bounds it at or below maxDepth), `authorization_details[0].scopes` to scopes, `par_hash` to parentHash. `constraints` has no Cred equivalent and is reported.

Reason mapping from Cred to the draft: `exp_not_monotonic` to `expired`, `parent_hash_mismatch` to `par_hash_mismatch`, `payload_undecodable` (JSON.parse rejecting a non-finite literal before a token is even constructed) to `non_finite`. Two vectors (`reject_bare_wildcard.json`, `reject_nonterminal_wildcard.json`) get a per-vector override instead of a blanket reason-map entry: Cred rejects an invalid wildcard as `not_narrower` via scope subsumption rather than a distinct malformed-scope error, but most `not_narrower` rejections are genuine over-broad-scope vectors whose own declared reason already is `not_narrower`, so the equivalence is scoped to just those two files (`VECTOR_REASON_OVERRIDES` in run.ts). All other reasons share a name.

## Result meanings

- PASS: Cred's outcome and reason match the vector's declaration.
- FAIL: Cred accepted a chain the vector rejects, rejected one it accepts, or rejected for a different reason. A FAIL is a bug.
- GAP: Cred accepted a chain the vector rejects because the property being tested is not represented in Cred's model. Three vectors currently GAP: `reject_exceeded_ceiling`, `reject_unsafe_integer` (no JCS/binary64 canonicalization, so out-of-safe-range integers look ordinary), and `reject_duplicate_member` (`JSON.parse` silently resolves a duplicate member to its last value). See `docs/design/delegation-constraints.md` in the sdk repo for the ceiling case.

## Current matrix

Against cred-ninja/sdk with wildcard scope subsumption, monotonic child expiry, and `verifyDelegationChain`:

| Vector | Expected | Cred | Result |
|---|---|---|---|
| valid_chain.json | accept | accept | PASS |
| valid_jcs_big_integer.json | accept | accept | PASS |
| valid_jcs_exponent_form.json | accept | accept | PASS |
| valid_jcs_integral_float.json | accept | accept | PASS |
| valid_jcs_non_ascii.json | accept | accept | PASS |
| valid_jcs_unmarked_header.json | accept | accept | PASS |
| valid_jcs_utf16_key_order.json | accept | accept | PASS |
| reject_bad_signature.json | signature_invalid | reject:signature_invalid | PASS |
| reject_depth_exceeded.json | depth_invalid | reject:depth_invalid | PASS |
| reject_nonmonotonic_exp.json | expired | reject:exp_not_monotonic | PASS |
| reject_spliced_parent.json | par_hash_mismatch | reject:parent_hash_mismatch | PASS |
| reject_widened_scope.json | not_narrower | reject:not_narrower | PASS |
| reject_wildcard_widening.json | not_narrower | reject:not_narrower | PASS |
| reject_wildcard_boundary.json | not_narrower | reject:not_narrower | PASS |
| reject_bare_wildcard.json | malformed | reject:not_narrower | PASS (mapped, see below) |
| reject_nonterminal_wildcard.json | malformed | reject:not_narrower | PASS (mapped, see below) |
| reject_non_finite.json | non_finite | reject:payload_undecodable | PASS (mapped, see below) |
| reject_exceeded_ceiling.json | not_narrower | accept | GAP |
| reject_unsafe_integer.json | malformed | accept | GAP |
| reject_duplicate_member.json | duplicate_member | accept | GAP |

17 of 20, 0 FAIL, 3 GAP.

Three PASSes carry a reason-name mismatch worth knowing about, all deliberate:
- `reject_bare_wildcard.json`, `reject_nonterminal_wildcard.json` declare `malformed`; Cred rejects both, but via scope subsumption (`not_narrower`) rather than a distinct malformed-scope error, because `isValidScope()` in delegation-chain.ts already treats an invalid wildcard as "matches only itself, never covers or is covered by anything else." Recorded per-vector in `VECTOR_REASON_OVERRIDES` in run.ts, not as a blanket reason-map entry, since most `not_narrower` rejections are genuine over-broad-scope vectors whose own declared reason already is `not_narrower`.
- `reject_non_finite.json` declares `non_finite`; Node's `JSON.parse` itself enforces RFC 8259 (no bare `NaN`/`Infinity`), so the payload fails to decode before it ever reaches the vault. Mapped as `payload_undecodable -> non_finite` in `REASON_MAP`.

The three GAPs are all offline/foreign-token-verification properties Cred's model doesn't represent: `reject_exceeded_ceiling` (constraints live in server policy, see sdk `docs/design/delegation-constraints.md`), `reject_unsafe_integer` (Cred never canonicalizes through JCS/binary64, so an integer at 2**53 looks like an ordinary in-range number), and `reject_duplicate_member` (`JSON.parse` silently keeps the last value of a duplicate member, so Cred's decoder has no way to see the duplicate).

Before the sdk's wildcard-subsumption fix the shipping code scored 1 of 7 on the original vector set: every chain except bad_signature died at hop 1 with `no_scopes_granted` because scope comparison was exact-match and could not narrow `crm.*` to `crm.read`. The runner depends on `verifyDelegationChain`, which did not exist then, so it cannot be pointed at that code; the 1 of 7 figure comes from the original ad hoc harness.
