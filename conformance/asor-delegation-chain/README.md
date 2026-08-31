# Conformance: draft-asor-wimse-agent-delegation-chain-00 Appendix B vectors

Runs the interop vectors published with [draft-asor-wimse-agent-delegation-chain-00](https://datatracker.ietf.org/doc/draft-asor-wimse-agent-delegation-chain/) through Cred's shipping delegation chain logic and prints a pass/fail/gap matrix.

## Vectors

The seven files in `vectors/` are copied verbatim from [attenu-io/attenu-guard](https://github.com/attenu-io/attenu-guard) at commit `4cfe7ccbe28671289234ebfde1cb5ece90d6da8f`, path `tests/vectors/`. They are not fetched at test time. To refresh them, copy the files from a newer commit and update the hash here.

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

Reason mapping from Cred to the draft: `exp_not_monotonic` to `expired`, `parent_hash_mismatch` to `par_hash_mismatch`. All others share a name.

## Result meanings

- PASS: Cred's outcome and reason match the vector's declaration.
- FAIL: Cred accepted a chain the vector rejects, rejected one it accepts, or rejected for a different reason. A FAIL is a bug.
- GAP: Cred accepted a chain the vector rejects because the property being tested is not represented in Cred's model. Today the only GAP is `reject_exceeded_ceiling`; see `docs/design/delegation-constraints.md` in the sdk repo.

## Current matrix

Against cred-ninja/sdk with wildcard scope subsumption, monotonic child expiry, and `verifyDelegationChain`:

| Vector | Expected | Cred | Result |
|---|---|---|---|
| valid_chain.json | accept | accept | PASS |
| reject_bad_signature.json | signature_invalid | reject:signature_invalid | PASS |
| reject_depth_exceeded.json | depth_invalid | reject:depth_invalid | PASS |
| reject_exceeded_ceiling.json | not_narrower | accept | GAP |
| reject_nonmonotonic_exp.json | expired | reject:exp_not_monotonic | PASS |
| reject_spliced_parent.json | par_hash_mismatch | reject:parent_hash_mismatch | PASS |
| reject_widened_scope.json | not_narrower | reject:not_narrower | PASS |

6 of 7. Before those sdk changes the shipping code scored 1 of 7: every chain except bad_signature died at hop 1 with `no_scopes_granted` because scope comparison was exact-match and could not narrow `crm.*` to `crm.read`. The runner depends on `verifyDelegationChain`, which did not exist then, so it cannot be pointed at that code; the 1 of 7 figure comes from the original ad hoc harness.
