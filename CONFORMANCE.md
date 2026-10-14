# Conformance Requirements

This checklist separates the prepared `-01` custody contract from its retained
compatibility profile. The source of truth is
[`ietf/draft-sweeney-wimse-credential-delegation-01.mkd`](ietf/draft-sweeney-wimse-credential-delegation-01.mkd).
An implementation claiming the compatibility profile must also satisfy the core.
The [SDK capability map](https://github.com/cred-ninja/sdk/blob/main/docs/protocol-conformance.md)
records implementation gaps; neither this checklist nor the mapped chain-vector
results establishes full protocol conformance or Wire 0.2.0 support.

## Core service contract

### Custody and exercise
- MUST keep upstream credentials encrypted at rest and expose only opaque custody references.
- MUST bind the authorized Subject, grant, actor, and Vault entry; a handle alone grants no authority.
- MUST NOT expose credentials in agent-facing tokens, responses, errors, or logs.
- MUST authenticate the actor and validate issuer trust, signature, validity, and required proof binding.
- MUST resolve current authority, consent, and revocation before issuance and exercise; deny unresolved required checks.
- MUST authorize the actual operation, resource, and parameters and use those same values for the upstream call.
- MUST fail closed on unknown or unevaluable restrictions and enforce shared aggregate budgets without concurrent overspend.
- MUST record the exercise decision without credentials.

### Delegation and receipts
- MUST re-verify parent authority and the receipt chain at every hop, including the permission to re-delegate.
- MUST enforce equal-or-narrower operations, resources, and constraints, with order-independent policy intersection.
- MUST bound child lifetime by parent and consent validity.
- MUST preserve the root Subject and bind authenticated current and prior actors to the correct hop.
- MUST produce signed receipts binding parent/child identifiers, actors, Subject, effective authority, source identity evidence, and actor verification time.
- MUST provide authenticated chain reconstruction; attribution and historical receipts do not independently establish current authority.
- MUST keep tamper-evident delegation-event records without raw credentials.
- SHOULD retain the distinct detailed per-hop policy-input audit record.
- SHOULD enforce a maximum chain depth of 5; SHOULD use a 15-minute DT lifetime and MUST NOT exceed 1 hour.

### Consent, revocation, and composition
- MUST retain immutable consent evidence and apply current policy during issuance and exercise.
- MUST invalidate revoked delegations and descendants, reject invalidated use, and log the revocation time.
- MUST NOT describe revocation as rollback of an already-dispatched upstream action.
- MUST select a documented wire/authority profile that preserves the core guarantees.
- MUST preserve issuer and matched Platform-registration context when mapping WAG identity evidence.
- MUST NOT treat WAG bearer identity as proof of key possession, Subject consent, or authority to re-delegate.
- MUST deny an unmapped restriction when composing authority formats.

## Retained compatibility profile

These requirements apply only when selecting the draft's
[compatibility profile](draft-sweeney-wimse-credential-delegation-01.md#compatibility-profile),
in addition to the core. They are not claims about deployed SDK behavior.

### Version negotiation
- Clients MUST advertise `Cred-Protocol-Version`; servers MUST set it on every protocol response.
- MUST maintain supported versions and a floor; unsupported explicit versions receive HTTP 426 with `protocol_version_unsupported`.
- MAY treat a missing request header as `0.1.0` only while the floor is `0.1.0`.
- Clients MUST reject unsupported or below-floor response versions and distinguish version errors from other failures.

### Agent authentication and token presentation
- Agents MUST generate Ed25519 or P-256 keys and derive a did:key; SHOULD use a new key per session.
- DS MUST NOT reject a DID solely because it is new; consent and issuance policy still apply.
- MUST validate RFC 7523 assertions, including signature, audience, 300-second lifetime, and `jti` replay protection.
- MUST issue DPoP-bound JWT DTs with the claims in [Delegation Token Claims](draft-sweeney-wimse-credential-delegation-01.md#token-claims); `client_id` and `act.sub` MUST agree.
- MUST apply RFC 9449 proof and token-binding checks on `/exercise`, over HTTPS.
- DPoP does not sign arbitrary request bodies; MUST separately authorize the exact proxy operation and parameters.

### Authority and receipt representation
- `authorization_details` uses the retained `cred_delegation` capability shape.
- `constraints` uses the pinned Asor -01 Sections 4.2/4.3 semantics; malformed, duplicate-key, unknown, or unorderable constraints fail closed.
- MUST retain each parent constraint with the same key/type and equal-or-narrower values; omission in a request inherits rather than removes it.
- MUST preserve Subject in `sub` and actor in `act.sub`, with DS-signed receipt links in `prf` and per-hop verified actor/time evidence.
- Exact receipt serialization, content identifiers, and complete CIBA/DPoP interactions remain specification work. Do not infer their interoperability from the mapped vector results below.

### Revocation and consent
- MUST invalidate a selected revoked DT within **1 second** and descendants within **5 seconds**.
- MUST return HTTP 401 with `delegation_revoked` for in-flight exercise requests using a revoked DT; this does not establish rollback of an upstream effect.
- `DELETE /delegation/{jti}` MUST return `revoked_count`; an immutable revocation event is required.
- MUST retain consent records for at least 90 days.
- MUST re-request consent for broader capabilities, expired grants, changed `agent_operator`, or a security event requiring policy re-evaluation.
- Retained CIBA-derived interaction is a profile choice, not a replacement for current consent checks or evidence of SDK support.

## Future direct resource-server composition

Direct token exchange or native resource-server access needs a separate profile
for audience, authority mapping, holder binding, and revocation. It is outside
this custody contract and is not established by the chain tests below.

Full protocol conformance tests remain incomplete. The chain interoperability
tests below cover only their stated properties.

## Interoperability Vectors

Cred is scored against the Appendix B interop vectors of draft-asor-wimse-agent-delegation-chain-00, which pin the wire subsumption relation (scope narrowing with prefix wildcards, chain depth, parent commitment linkage, expiry ordering, signature validity) for a chain of Delegation Tokens. The runner, the vendored vectors, the claim mapping, and the current matrix are in [`conformance/asor-delegation-chain/`](conformance/asor-delegation-chain/README.md). It runs in CI against the sdk main branch.

Retained baseline: 20 of 20 against the v0.9.0 vector set, 0 FAIL, 0 GAP, pinned to sdk main `a41366e` (2026-10-07, PR #45 merged; identical at `b1bfec0`) with retained output under `conformance/asor-delegation-chain/results/`. Earlier pins: `e92af19` (2026-10-06) scored 18 of 20 with the two JSON canonicalization vectors as GAPs; `4a24376` and `ff00421` scored 17 of 20 with the ceiling vector as a GAP as well. The sdk covers all six asor-01 section 4.2 constraint types, the runner passes `constraints` through, and the sdk's strict JSON decoder (`parseStrictJson`) rejects duplicate members and integers outside the binary64 exact range the way JCS requires. Four further scope-class vectors proposed for the -02 (see the runner README) pass 4 of 4.

Additional requirements of the mapped SDK chain profile (not a universal authority grammar for the custody core):
- MUST apply the selected scope profile's classification before wildcard matching. In the SDK's three-class profile, `prefix.*` covers a structured literal or a narrower wildcard beneath `prefix.`, never an opaque provider scope. A concrete grant does not cover a requested wildcard.
- MUST compare opaque provider scopes by exact, case-sensitive equality; a shared text prefix does not establish coverage. For example, `drive.*` covers `drive.read` and `drive.files.*`, but not `drive.Read`; `repo:status` covers only `repo:status`.
- MUST NOT issue a child receipt whose `exp` is later than the parent receipt's `exp`
- MUST include in every non-root receipt a commitment to the exact bytes of its parent receipt, and MUST verify that commitment when the ancestors are presented

### Profile and test boundaries

The opaque-scope extension is a Cred implementation choice and a proposal for
Asor `-02`, not an adopted change to Asor `-01`. Classification is literal,
then wildcard, then opaque, as detailed in the runner's
[proposed-vector section](conformance/asor-delegation-chain/README.md#proposed-vectors-not-yet-in-attenu-guard).
OAuth itself defines case-sensitive scope strings, not this wildcard algebra
([RFC 6749, Section 3.3](https://www.rfc-editor.org/rfc/rfc6749.html#section-3.3)).
The SDK also preserves exact equality for legacy malformed scope strings such
as `read:*`; that compatibility behavior is not strict Asor grammar conformance
and is not ruled out by the retained 20-vector or 4-vector results.

The runner verifies the vectors' HS256 signatures and computes their parent
commitments before passing mapped hops to the SDK. Native Cred receipts use
Ed25519 and a different commitment encoding. These results therefore establish
the tested narrowing, depth, expiry, parsing and linkage decisions, not receipt
wire-format interoperability. They do not test custody, DPoP, `/exercise`,
consent freshness, or revocation latency. Those require separate checks before
claiming the corresponding requirements above are implemented.

