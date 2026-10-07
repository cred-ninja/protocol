# Conformance: draft-asor-wimse-agent-delegation-chain Appendix B vectors (v0.9.0, 20 vectors)

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
- GAP: Cred accepted a chain the vector rejects because the property being tested is not represented in Cred's model. No vector currently GAPs against sdk `b1bfec0` or later. `reject_exceeded_ceiling` was a GAP through sdk `ff00421`, and `reject_unsafe_integer` and `reject_duplicate_member` through `e92af19`; see the pinned runs below.

## Pinned runs

Scores are only citable with the SDK commit they were taken at. Retained machine output lives in `results/`.

| Run date | cred-ninja/sdk commit | Result | Output |
|---|---|---|---|
| 2026-09-03 | `4a24376638764ab93fcfbf981ab62635cbb83264` | 17 of 20, 0 FAIL, 3 GAP | `results/2026-09-03-sdk-4a24376.json` (Node 20.20.2) |
| 2026-10-06 | `ff00421b1a237f20c6de07cc49b33a23e7352181` | 17 of 20, 0 FAIL, 3 GAP | `results/2026-10-06-sdk-ff00421.json` (Node 22.22.0) |
| 2026-10-06 | `e92af1903a5c9bcf1b485ff6cd243c64b718338f` | 18 of 20, 0 FAIL, 2 GAP | `results/2026-10-06-sdk-e92af19.json` (Node 22.22.0) |
| 2026-10-07 | `b1bfec02e941378164aba380bde15d831aaf6636` | 20 of 20, 0 FAIL, 0 GAP | `results/2026-10-07-sdk-b1bfec0.json` (Node 22.22.0) |

The `ff00421` SDK carried constraint ceilings in receipts and enforced asor-01 section 4.3 subsumption, but its `parseConstraints` accepted only numeric `max` and numeric `rank`, while the vectors use `{"key": "egress", "rank": "any"}`, an ordered-enumeration rank label per section 4.2. Passing `constraints` through would have failed every valid chain, so the runner withheld it and `reject_exceeded_ceiling` stayed GAP. sdk `e92af19` (cred-ninja/sdk PR #41) covers all six section 4.2 types and resolves rank labels through a per-key ordering seeded with the draft's `egress` none < internal < any; the runner now maps `constraints` onto `DelegationChainHop.constraints` and hands the parsed lists to `validateSubDelegation` the way the subdelegate route does. Against an SDK older than `e92af19` the constrained vectors now fail closed as `malformed` at hop 0; that is the correct reading of section 4.2 for an implementation that does not know the `rank` label form.

sdk `b1bfec0` (cred-ninja/sdk PR #45) adds `parseStrictJson`, which rejects duplicate member names and integers outside the binary64 exact range, and uses it to decode receipts. The runner decodes vector payloads the same way when the sdk under test exports it (falling back to `JSON.parse` for older sdks), so `reject_duplicate_member` and `reject_unsafe_integer` pass: 20 of 20.

Spec input for asor -02: `rank` labels carry no ordering on the wire. The draft names one example ordering and the vectors depend on it. Either the constraint-types registry entry for a key carries its ordering, or the token does; the SDK fails closed on any label without a registered ordering.

## Current matrix

Against cred-ninja/sdk `b1bfec0` (2026-10-07). `e92af19` differs only in the two JSON rows below (GAP there); `4a24376` and `ff00421` also GAP on `reject_exceeded_ceiling`:

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
| reject_exceeded_ceiling.json | not_narrower | reject:not_narrower | PASS |
| reject_unsafe_integer.json | malformed | reject:unsafe_integer | PASS (mapped, see below) |
| reject_duplicate_member.json | duplicate_member | reject:duplicate_member | PASS |

20 of 20, 0 FAIL, 0 GAP.

Four PASSes carry a reason-name mismatch worth knowing about, all deliberate:
- `reject_bare_wildcard.json`, `reject_nonterminal_wildcard.json` declare `malformed`; Cred rejects both, but via scope subsumption (`not_narrower`) rather than a distinct malformed-scope error, because `isValidScope()` in delegation-chain.ts already treats an invalid wildcard as "matches only itself, never covers or is covered by anything else." Recorded per-vector in `VECTOR_REASON_OVERRIDES` in run.ts, not as a blanket reason-map entry, since most `not_narrower` rejections are genuine over-broad-scope vectors whose own declared reason already is `not_narrower`.
- `reject_non_finite.json` declares `non_finite`; the strict decoder (and `JSON.parse` before it) enforces RFC 8259 (no bare `NaN`/`Infinity`), so the payload fails to decode before it ever reaches the vault. Mapped as `payload_undecodable -> non_finite` in `REASON_MAP`.
- `reject_unsafe_integer.json` declares `malformed`; the strict decoder rejects the integer as `unsafe_integer`, mapped to `malformed` in `REASON_MAP`.

There are no GAPs against sdk `b1bfec0`. Before it, `reject_unsafe_integer` and `reject_duplicate_member` were GAPs because Cred decoded receipts with `JSON.parse`, which rounds integers past 2**53 and keeps the last value of a duplicate member; `parseStrictJson` in the sdk vault now rejects both.

Before the sdk's wildcard-subsumption fix the shipping code scored 1 of 7 on the original vector set: every chain except bad_signature died at hop 1 with `no_scopes_granted` because scope comparison was exact-match and could not narrow `crm.*` to `crm.read`. The runner depends on `verifyDelegationChain`, which did not exist then, so it cannot be pointed at that code; the 1 of 7 figure comes from the original ad hoc harness.

## Proposed vectors (not yet in attenu-guard)

`proposed-vectors/` holds vectors Cred has offered upstream and that are not part of the pinned v0.9.0 set. They are generated, not copied: `npx tsx make-scope-vectors.ts` rewrites them deterministically with the same JCS + HS256 + `par_hash` recipe the v0.9.0 files use, so they can be diffed against whatever Asor adopts. Run them with `npx tsx run.ts --sdk PATH --vectors ./proposed-vectors`.

Scope classes, offered 2026-10-06 for the -02 (list thread with Rafael Asor and Iman Schrock), grammar:

```
scope          = literal-scope / wildcard-scope / opaque-scope
literal-scope  = segment "." segment *("." segment)        ; -01 4.1, unchanged
wildcard-scope = segment *("." segment) ".*"               ; -01 4.1, unchanged
opaque-scope   = 1*( %x21 / %x23-29 / %x2B-5B / %x5D-7E )  ; RFC 6749 scope-token minus "*"
```

Classification by precedence (literal, wildcard, opaque, else malformed). A wildcard covers a literal under its prefix and never an opaque scope; an opaque scope covers only a byte-identical opaque scope.

| Vector | Expected | Tests |
|---|---|---|
| reject_wildcard_over_opaque.json | not_narrower | `drive.*` over `drive.Read`: shared prefix, but uppercase makes the child opaque. A raw-prefix verifier accepts this and is wrong (cred-ninja/sdk main before PR #43 did). |
| reject_opaque_over_wildcard.json | not_narrower | `drive.Read` over `drive.*`: an opaque grant never covers a wildcard. |
| valid_wildcard_over_literal.json | accept | `payment.*` over `payment.release`: the -01 4.1 rule, unchanged. Pairs with emilia's `payment-terminal-wildcard-covered`. |
| valid_opaque_exact.json | accept | `User.Read`, `repo:status` over `repo:status`: provider-native scopes narrow by exact equality. Under -01 4.1 as written both tokens are malformed; this is the gap the opaque class closes. |

Against cred-ninja/sdk with `classifyScope` (PR #43): 4 of 4. Against sdk main at `9995d53`: 3 of 4, `reject_wildcard_over_opaque` accepted, which is the behaviour the PR fixes.
