# Design note: independently verifiable root approval and custody-neutral deployment (-03)

Status: design note for draft-sweeney-wimse-credential-delegation-03. Not -02 text. Nothing here changes -02, and this note is not to be merged before -02 is posted. Appendix A holds kramdown-rfc text intended to be pasted into the -03 `.mkd` once the design below is settled.

Section numbers in this note refer to the -02 draft: Section 3 (Architecture Overview), Section 5 (Delegation Token Format, including 5.4 Delegation Chain Integrity and 5.5 Chain-Verifiable Profile), Section 6 (Credential Wrapping), Section 7 (Revocation), Section 8 (Consent Flow), and Section 10 (Security Considerations).

## Goal

Give the root of each grant independently verifiable evidence that a key the Subject controls, not the Delegation Server (DS) operator, endorsed the exact grant. Three things stay as they are:

- The DS-signed hop receipts and the `prf` chain of Section 5.4 remain the per-hop evidence.
- The chain-verifiable profile of Section 5.5 keeps the draft-asor-wimse-agent-delegation-chain `agent_delegation` format unchanged. Approval evidence never enters that closed object.
- Cred does not adopt the receipt format of draft-nelson-agent-delegation-receipts or the token profile of draft-yossif-psea. Both are overlapping work on principal-held evidence; Cred cites them informatively and does not implement their schemas.

-03 also adds custody-neutral deployment language: the DS is one logical authorization and accounting service whatever its physical custody arrangement.

## 1. Problem and the honest property

In -02, every artifact that ties a Delegation Token to the Subject's consent is produced by the DS: the consent record (Section 8.2), the root receipt, and every hop receipt (Section 5.4). A verifier that does not trust the DS operator has no evidence that the Subject agreed to anything. A DS operator, or an attacker holding the DS signing key, can mint a consent record and a root receipt for a grant the Subject never saw, and the result verifies.

The property -03 adds is narrow, and the text should state it in these terms:

> An independently enrolled, user-controlled key endorsed this exact grant, under the stated ceremony assumptions.

"Exact grant" means the full approval object G of Section 2 below, bound by the digest D of Section 3. "Independently enrolled" means the association between the Subject and that key is anchored somewhere the DS cannot rewrite on its own (Section 5). "Under the stated ceremony assumptions" means the property inherits the trust placed in the approval client, the authenticator, and the enrollment anchor; it is not stronger than those.

What the evidence does not prove:

- Comprehension. A valid signature shows that the key signed D. It does not show that the person read, understood, or would have agreed to G if it had been rendered differently.
- Ordering of approval before execution. The evidence shows the key signed a G that names a preallocated root `jti` and a validity interval. Whether the DS waited for that evidence before acting is a property of DS behavior, which a verifier checks only by its own enforcement or by comparing timestamps the DS also controls.
- Honest enforcement by the DS. Evidence of approval says nothing about whether the DS then confined exercise to the approved capabilities, honored revocation, or kept cumulative totals.
- Absence of unrecorded credential use. A DS holds the underlying credentials in its Credential Vault. A malicious DS holding an unrestricted upstream credential can call the resource server directly, with or without any approval, and nothing in the receipt chain records that call.

The consequence for the text: root approval evidence detects a forged root grant and makes the DS accountable for one. It does not prevent misuse by the DS. Prevention needs an independent enforcement boundary that holds or narrows the credential outside the DS, such as a resource server that checks the approval itself, an upstream credential scoped no wider than G, or custody arranged so that no single operator can exercise the credential alone (Section 7).

## 2. Approval object G

G is a closed, versioned JSON object. "Closed" means a member not defined here makes G invalid. "Versioned" means the `purpose` and `version` pair selects the schema, and a verifier that does not implement that pair rejects G.

G carries everything the root Delegation Token and its root receipt will commit to, so that no part of the grant is resolved through a reference the DS can change after signing.

| Member | Type | Meaning |
|---|---|---|
| `purpose` | string | MUST be `"cred.grant.approve"`. |
| `version` | integer | MUST be `1`. |
| `ds` | string | The DS identifier, identical to the `iss` the root DT will carry. |
| `tenant` | string | The tenant identifier within the DS. A single-tenant DS uses a fixed value it publishes; the member is never omitted. |
| `subject` | object | `{"ns": <namespace>, "id": <identifier>}`. `ns` names the identifier namespace (for example an issuer URL); `id` is the stable Subject identifier within it, equal to the outer `sub` the chain will preserve. |
| `consent_id` | string | The consent record identifier the root DT will carry. Allocated by the DS before the ceremony. |
| `root_jti` | string | The preallocated `jti` of the root Delegation Token. |
| `approval_key` | object | `{"kid": <string>, "epoch": <integer>}`. The enrolled approval key identifier and the enrollment epoch it belongs to (Section 5). |
| `account` | object | `{"provider": <string>, "account": <string>}`. The immutable binding to the upstream account: the provider identifier and the provider's stable account identifier (for example an OpenID Connect `iss` and `sub` pair rendered as one string). Never a display name, email address, or Vault handle. |
| `agent` | object | `{"did": <Agent DID>, "operator": <string>, "jkt": <string>}`. The initial Agent's DID, its `agent_operator` value, and the RFC 7638 JWK thumbprint (SHA-256, base64url) of the key the root DT's `cnf.jkt` will name under RFC 9449. |
| `authorization_details` | array | The complete RFC 9396 capability array the root DT will carry, verbatim. |
| `constraints` | array | The complete constraint ceiling array (Section 5.3), verbatim. An unconstrained grant carries `[]`. |
| `redelegation` | object | `{"allowed": <boolean>, "max_depth": <integer>}`. `max_depth` counts hops below the root; `allowed: false` requires `max_depth: 0`. |
| `nbf` | integer | Start of the grant's validity interval. |
| `exp` | integer | End of the grant's validity interval. Bounds every token and reissuance under this consent. |
| `approve_by` | integer | Approval deadline. Evidence verified after this time is rejected, and `approve_by` MUST NOT be later than `exp`. |
| `nonce` | string | At least 128 bits from a CSPRNG, base64url without padding, generated per ceremony. |

Defaults and units:

- Every member is REQUIRED. There are no omitted-member defaults; the producer writes the value it means. A grant that permits no redelegation carries `{"allowed": false, "max_depth": 0}`, and a grant with no ceilings carries `"constraints": []`.
- Times are NumericDate values (integer seconds since the epoch, UTC). Fractional seconds are invalid.
- Integers MUST be within the range exactly representable by an IEEE 754 binary64 value, as RFC 8785 requires. Quantities inside `constraints` keep the units their `key` defines; G adds no unit conversion.
- Strings are compared as exact code point sequences. No case folding or Unicode normalization is applied.

No mutable references. G MUST NOT name a policy, template, scope set, credential handle, or account by an identifier whose meaning the DS can change after signing. `credential_handle` is deliberately absent: the handle is DS-internal, and the immutable `account` binding is what the Subject approves. The DS MUST verify, when it activates the grant, that the handle it will put in the root DT resolves to the account named in G.

## 3. Commitment

```
C = UTF-8( JCS(G) )                                   ; RFC 8785
D = SHA-256( UTF-8("cred.grant.approve.v1") || 0x00 || C )
```

The ASCII label and the single zero octet separate this digest from any other SHA-256 over JCS output a deployment computes. The label's `v1` tracks `version`; a later schema version uses a new label.

Input validation happens before canonicalization. A producer or verifier MUST reject, and MUST NOT canonicalize, a G that:

- is not well-formed I-JSON: duplicate member names, lone surrogates, or numbers outside the binary64 range;
- carries a member not defined for its `purpose` and `version`, or omits a REQUIRED member;
- has a member of the wrong type, a non-integer time, `approve_by` later than `exp`, `nbf` not earlier than `exp`, `redelegation.allowed` false with a non-zero `max_depth`, or a `constraints` array that is malformed under Section 5.3;
- names a `ds`, `tenant`, or `approval_key` the verifier does not expect for this ceremony.

Canonicalizing first and validating afterwards lets two parties compute the same D over inputs they parsed differently. Rejecting first removes that class of disagreement.

The approval client renders G and recomputes D itself. The approval client is the software that shows G to the Subject and invokes the Subject's key. It MUST be outside unilateral DS control: a platform application, a customer-operated application, or a browser extension whose code the DS operator cannot replace on its own. If the DS serves both the page that renders G and the code that computes D, the DS can show one grant and obtain a signature over another, and the property of Section 1 reduces to trusting the DS. The approval client receives G, validates it as above, renders every member that affects authority, computes C and D, and only then invokes the key.

## 4. Proof profiles

A proof binds D to the enrolled approval key. Two profiles are defined. A deployment MAY support either or both; a verifier states which it accepts (Section 5).

### 4a. WebAuthn assertion

The approval client calls `navigator.credentials.get()` (W3C Web Authentication Level 3) with:

- `challenge` set to the 32 octets of D;
- `allowCredentials` containing only the credential ID enrolled as `approval_key.kid` at `approval_key.epoch`;
- `userVerification: "required"`.

The verifier MUST perform the full assertion verification procedure of WebAuthn Level 3 Section 7.2, including: `type` is `"webauthn.get"`; `challenge` decodes to exactly D; `origin` is on the verifier's allowlist for this deployment; cross-origin and `topOrigin` values are rejected unless the verifier's policy names them; `rpIdHash` matches the expected RP ID; the UP and UV flags are both set; the credential ID is the enrolled one; the signature verifies over `authenticatorData || SHA-256(clientDataJSON)` under the enrolled credential public key with an algorithm on the verifier's allowlist; and signature counter handling follows the verifier's policy.

Evidence retention. The DS MUST retain, and export with the evidence, the original octets of `clientDataJSON`, `authenticatorData`, and `signature`, and the credential ID. A verifier MUST verify against the retained `clientDataJSON` octets. Nobody in the chain may reserialize `clientDataJSON`: the signature covers the hash of the exact octets the client produced, and a parsed-and-rewritten copy either fails verification or, worse, is checked against a hash recomputed from the rewrite.

Limits to state plainly:

- A passkey prompt shows the RP name and asks for user verification. It does not display G. Whatever the Subject saw of G was rendered by the approval client, so the ceremony assumption in Section 1 includes that client.
- A synced passkey is held by a sync provider and recoverable through that provider's account recovery. Its evidence adds the sync provider's and recovery channel's trust to the property. A deployment that needs a device-bound key states that in its verifier policy, for example by requiring attestation at enrollment.

### 4b. JWS by a Subject-held key

The approval client produces a JWS (RFC 7515) whose payload is exactly the octets C, signed by a key the Subject holds.

- Protected header MUST contain `typ: "cred-grant-approval+json"`, `alg`, and `kid` equal to `approval_key.kid`.
- `alg` MUST be on the verifier's local allowlist; the header never selects the algorithm by itself (Section 4.1 of -02 already requires this of every verifier). Ed25519 (`EdDSA`) and `ES256` are expected; ML-DSA is admissible where both parties support it.
- The protected header MUST NOT carry `jwk`, `jku`, `x5u`, or `x5c`. The verification key comes from the enrollment record (Section 5), never from the message.
- `crit` MUST NOT be present unless every listed parameter is understood by the verifier.
- The verifier MUST validate the payload as G (Section 3), recanonicalize it, and reject the JWS if the result is not octet-identical to the payload.

What is never a substitute:

- A DS-signed wrapper, attestation, or receipt asserting that the Subject approved. That is the -02 status quo the profile exists to go beyond.
- The result of a CIBA (OpenID CIBA Core 1.0) flow. CIBA MAY orchestrate the ceremony: the DS starts a backchannel request, the Subject's device runs the approval client, and the DS learns the outcome. But a CIBA authentication result is issued by the authorization server and shows that the Subject authenticated, not that the Subject's key signed D. The evidence is the WebAuthn assertion or JWS itself.

## 5. Enrollment and recovery

The evidence is only as independent as the association between the Subject and the approval key. That association MUST be anchored outside unilateral DS control. Acceptable anchors:

- A verifier-pinned enrollment record. The verifier (a resource server, the customer, an auditor) records the approval key, or WebAuthn credential public key, at enrollment through a channel it trusts, and accepts evidence only under keys it pinned.
- Customer identity infrastructure. The customer's identity provider, not the DS, signs an enrollment statement binding `subject` to the approval key and epoch.
- Prior recovery keys. The Subject's previously enrolled recovery key signs the new enrollment.

A DS-signed enrollment record alone is not an anchor: a DS that can enroll a key for a Subject can approve for that Subject.

An enrollment record states: `subject` (`ns` and `id`), `kid`, the public key or credential public key, `epoch`, the profile (`webauthn` or `jws`), the anchor type, and the anchor's signature or reference.

Rotation. A new approval key starts a new epoch. The rotation either proves continuity (the outgoing key, or a recovery key, signs the new enrollment) or is marked as new trust establishment. Verifiers that rely on continuity treat a new-trust epoch as a fresh enrollment that they must anchor again before accepting evidence under it. Account recovery that bypasses every prior key is new trust establishment, and the record says so.

Downgrade. A verifier that requires the profile MUST reject a root grant whose evidence is missing, fails verification, uses a profile or algorithm the verifier did not allow, names an epoch the verifier has not anchored, or was produced under an enrollment the verifier does not trust. The DS has no means to declare that evidence is unnecessary for a given grant; whether evidence is required is the verifier's policy, not a field the DS sets.

Export. The DS SHOULD deliver the evidence (G, the proof, and the enrollment record reference) to the Subject or to another holder independent of the DS operator at activation time, so that a later dispute does not depend on the DS producing evidence against itself.

## 6. Chain binding and activation

Binding. The DS binds D, `consent_id`, and `root_jti` into its signed root consent receipt, alongside the members Section 5.4 already requires. The receipt also carries the proof profile and a digest of the retained evidence, so a verifier holding the receipt chain knows which evidence to fetch and can tell whether what it fetched is what the DS bound. The evidence itself is stored and exported with the receipt, not embedded in any token.

Activation is one atomic step. Before the ceremony, the DS holds a pending challenge recording `consent_id`, `root_jti`, D, and `approve_by`. When evidence arrives, the DS verifies it and then, in one transaction:

1. consumes the pending challenge, so that no second activation of the same `consent_id` or `root_jti` can succeed;
2. writes the root consent receipt binding D;
3. initializes cumulative accounting for the consent (Section 5.3 `max_lifetime` and `max_subtree` totals, and any running spend total);
4. issues the root Delegation Token with `jti` equal to `root_jti`.

If any step fails, none takes effect and the challenge stays pending until `approve_by`.

Reissuance. Root tokens are short-lived (Section 10.6 of -02) while the grant runs to G's `exp`, so the DS reissues. A reissued root token carries a new `jti`, and the DS signs a reissuance receipt linking it to `root_jti`, `consent_id`, and D. Cumulative totals are measured over the consent, not over a token: reissuance MUST NOT reset, re-initialize, or fork any cumulative allowance. Reissuance MUST NOT extend past G's `exp` or change any member of G.

Re-approval. A change to any authority-bearing member of G requires a new G and new evidence: wider `authorization_details` or `constraints`, wider `redelegation`, a later `exp`, or a change of `subject`, `account`, `agent.did`, `agent.operator`, `agent.jkt`, `ds`, or `tenant`. This tightens the re-consent triggers of Section 8.3 of -02: an Agent key change, not only an operator change, needs new approval. Narrowing needs no approval; it is the existing attenuation of Section 5.4.

Unchanged wire surface. -03 defines no new OAuth grant type and leaves RFC 8693 token exchange as -02 uses it. It adds no member to the draft-asor-wimse-agent-delegation-chain `agent_delegation` detail or to any token under the chain-verifiable profile. A verifier of such a token that wants approval evidence obtains the receipt recorded under the token's `jti` (Section 5.5 of -02) and the evidence it references.

## 7. Custody and availability

Text for -03 (Architecture Overview, after the critical architectural property):

The DS is one logical authorization and accounting service. Its custody of credentials and signing keys may be arranged in several ways: tenant-isolated storage and keys within one operator; hardware-protected custody, including execution in an attested environment whose evidence a relying party appraises under the RATS architecture (RFC 9334); or custody split across several custodians so that no single party can exercise a credential alone. None of these arrangements relaxes the rules of this document. Authorization, attenuation, revocation, receipt issuance, and cumulative accounting apply to the logical DS exactly as written, however many components implement it.

Replicas. Where the DS runs as several replicas or regions, they serialize admission (issuing a token or authorizing an exercise), revocation, and budget reservation over one logical state. A replica that cannot confirm it is acting on the current state, for example during a partition, fails closed: it does not issue, does not authorize an exercise, and does not debit a cumulative total from a local copy. Availability during a partition is traded away for the single-writer property cumulative ceilings depend on.

Fencing. Each executor that dispatches upstream calls holds a lease or epoch issued by the serialized state. The DS checks the fence before dispatch and before recording the outcome; an executor whose lease has been superseded is refused. A stale executor that already dispatched a call before losing its lease cannot be recalled by the DS.

Upstream effects are not transactional with DS state. A call the DS dispatched may commit at the resource server whether or not the DS records it, and a timeout does not show that it failed. The DS therefore reserves budget before dispatch and settles afterwards, and an outcome it cannot determine counts as consumed. Revocation stops new dispatch; it does not undo an effect already in flight (Section 7 of -02 already says this for `revoked_count`).

## 8. Negative test vectors to add

Each vector starts from a valid root grant (G, D, evidence, enrollment record, root receipt) and applies one mutation. All are to be added to `conformance/` once the formats settle. A vector fails closed: the expected outcome is a rejection with no token issued and no accounting change.

| ID | Mutation | Expected outcome |
|---|---|---|
| RA-01 | Substituted approval key: evidence signed by a valid key that is not the one enrolled under `approval_key.kid` and `epoch` for this Subject (including a DS-generated key) | Reject: key not enrolled for Subject |
| RA-02 | Altered G after signing: any one member of G changed (one capability, one ceiling, `exp`, `agent.jkt`, `account`) while the evidence is unchanged | Reject: D mismatch |
| RA-03 | Omitted evidence: root receipt binds D but no proof is presented, or the receipt omits D, under a verifier policy that requires the profile | Reject: evidence missing |
| RA-04 | Wrong DS or tenant: valid evidence over a G whose `ds` or `tenant` differs from the activating DS | Reject: audience mismatch |
| RA-05 | Replayed activation: the same valid evidence presented a second time for the same `consent_id` or `root_jti`, including after the first activation's token has expired | Reject: challenge already consumed; first activation's state unchanged |
| RA-06 | Downgraded profile: evidence under a profile or algorithm the verifier does not allow, a WebAuthn assertion with UV not set, or a JWS whose key is taken from a `jwk` header | Reject: profile not accepted |
| RA-07 | Reissuance resetting a cumulative budget: a reissued root token (new `jti`, same `consent_id`) presented after part of a `max_lifetime` total was consumed, against a DS that re-initialized the total | Exercise above the remaining allowance is refused; the conformance check fails a DS whose total restarted |
| RA-08 | Reserialized `clientDataJSON`: the retained `clientDataJSON` parsed and re-emitted (member order or whitespace changed, same values) | Reject: signature does not verify over the presented octets |

Further candidates, lower priority: `approve_by` passed before verification; G with a duplicate member name or an unknown member; non-canonical JWS payload (valid G, not JCS form); `redelegation.allowed: false` with `max_depth: 1`; a new-trust epoch presented to a verifier that requires continuity.

## 9. Standards positioning

-03 keeps Cred in the lane -02 established: the online, server-side half of delegation, where a DS holds the credentials, sits on every hop, revokes synchronously, and holds cumulative totals, with draft-asor-wimse-agent-delegation-chain as the offline half. Root approval evidence adds verifiable support for a consent boundary Cred already has (Section 8 of -02). It is not a new human-mandate format, and it does not compete with work that defines one; draft-nelson-agent-delegation-receipts and draft-yossif-psea cover overlapping ground with their own schemas, which Cred cites but does not implement.

The change touches the Asor format only by attaching evidence outside it. The `agent_delegation` detail stays closed and unchanged, tokens under the chain-verifiable profile gain no member, and the evidence travels with the DS's receipt for that token's `jti`. One subsumption implementation still serves both drafts.

## 10. Open questions

- Adversary model. Which adversaries does -03 claim to address: an outside attacker holding the DS signing key, a malicious DS operator, a compromised approval client, or a compromised authenticator? The property in Section 1 holds against the first two only for detection, and against neither of the last two.
- Who controls the approval UI. Is a platform application or browser extension published by the DS operator "outside unilateral DS control"? Probably not without reproducible builds or third-party distribution; the text needs a test a reviewer can apply.
- Evidence before prevention. Is evidence alone worth specifying when a malicious DS can still use the credential? The argument for: it turns silent forgery into attributable forgery and is the input an independent enforcement point needs. That argument should be made in the draft, not assumed.
- Budget measurement semantics. Over what does a cumulative total run: the consent, the root token lineage, or the account? How are ambiguous upstream outcomes counted, and is "count as consumed" acceptable to deployments with real money in the total?
- Customer-operated custody. When the customer runs the Vault and the operator runs the policy engine, which party signs receipts, which holds the totals, and which side's failure fails closed?
- Live providers to demo. Which upstream providers give a stable, immutable account identifier for `account`, and which can scope an upstream credential narrowly enough to act as an independent enforcement boundary?

---

## Appendix A. Draft -03 text (kramdown-rfc)

### A.1 References to add to the front matter

````yaml
normative:
  RFC8785:
  RFC7515:
  WEBAUTHN-L3:
    title: "Web Authentication: An API for accessing Public Key Credentials Level 3"
    author:
      - org: W3C
    date: false
    target: https://www.w3.org/TR/webauthn-3/
    seriesinfo:
      W3C: Candidate Recommendation
informative:
  RFC9334:
  PSEA:
    title: "PSEA Token Profile: An EAT Profile for Action-Bound, User-Verification-Gated Transaction-Confirmation Evidence"
    author:
      - ins: M. Yossif
    date: false
    target: https://datatracker.ietf.org/doc/draft-yossif-psea/
    refcontent: Work in Progress, draft-yossif-psea
````

RFC 7638, RFC 8693, RFC 9449, OIDC-CIBA, ASOR, and DELEG-RECEIPTS are already in the -02 reference list. Refresh `refcontent` revision numbers against Datatracker at posting time.

### A.2 New section, placed after "Consent Flow"

````markdown
# Independently Verifiable Root Approval {#root-approval}

The consent records of {{consent-flow}} and the receipts of {{chain-integrity}} are produced by the DS. A verifier that does not trust the DS operator therefore has no evidence that the Subject agreed to a grant. This section defines optional evidence that a key the Subject controls, enrolled independently of the DS, endorsed the exact grant at the root of a Delegation Chain. It does not replace DS-signed receipts and adds no member to any token defined in this document or in {{ASOR}}.

The property the evidence supports is that an independently enrolled, user-controlled key endorsed this exact grant, under the assumptions stated for the approval client, the authenticator, and the enrollment anchor. It does not show that the Subject understood the grant, that the DS waited for approval before acting, that the DS then enforced the grant, or that the DS made no unrecorded use of the credential (see {{sec-root-approval}}).

{{DELEG-RECEIPTS}} and {{PSEA}} define principal-held evidence formats that overlap with this section; this document does not implement their schemas.

## Approval Object {#approval-object}

The approval object G is a JSON object with the following members, all REQUIRED. A member not listed here makes G invalid.

`purpose`:
: The string `cred.grant.approve`.

`version`:
: The integer `1`.

`ds`:
: The DS identifier, equal to the `iss` of the root Delegation Token.

`tenant`:
: The tenant identifier within the DS. A single-tenant DS uses a fixed value it publishes.

`subject`:
: An object with members `ns`, naming the identifier namespace, and `id`, the Subject identifier within it, equal to the root Delegation Token's `sub`.

`consent_id`:
: The `consent_id` the root Delegation Token will carry.

`root_jti`:
: The `jti` the root Delegation Token will carry, allocated before approval.

`approval_key`:
: An object with members `kid`, the enrolled approval key identifier, and `epoch`, the integer enrollment epoch ({{approval-enrollment}}).

`account`:
: An object with members `provider` and `account`: the upstream provider identifier and the provider's stable, immutable identifier for the account whose credential the grant exercises.

`agent`:
: An object with members `did`, the initial Agent's DID; `operator`, its `agent_operator` value; and `jkt`, the JWK thumbprint {{RFC7638}} of the key the root Delegation Token's `cnf.jkt` {{RFC9449}} will name.

`authorization_details`:
: The complete capability array of the root Delegation Token.

`constraints`:
: The complete constraint ceiling array of the root Delegation Token ({{constraint-ceilings}}); `[]` when the grant has none.

`redelegation`:
: An object with members `allowed`, a boolean, and `max_depth`, the integer number of hops permitted below the root. When `allowed` is false, `max_depth` MUST be 0.

`nbf`, `exp`:
: The grant's validity interval. No Delegation Token issued under the grant may be valid outside it.

`approve_by`:
: The time after which approval evidence is no longer accepted. It MUST NOT be later than `exp`.

`nonce`:
: A base64url-encoded value of at least 128 bits from a cryptographically secure random source, fresh for each approval.

Times are integer NumericDate values. G has no defaults: a producer writes every member with the value it means. G MUST NOT identify any authority-bearing element by a reference whose meaning the DS can change after approval; in particular, G does not carry `credential_handle`, and the DS MUST confirm at activation that the handle it places in the root Delegation Token resolves to the account named in `account`.

## Commitment {#approval-commitment}

The commitment C is the UTF-8 encoding of the JSON Canonicalization Scheme {{RFC8785}} serialization of G. The approval digest is:

~~~
D = SHA-256( UTF-8("cred.grant.approve.v1") || 0x00 || C )
~~~

A producer or verifier MUST reject G, and MUST NOT canonicalize it, if G is not valid I-JSON, contains a duplicate member name, contains a member not defined in {{approval-object}}, omits a member, has a member of the wrong type, or violates a constraint stated there.

The approval client is the software that displays G to the Subject and invokes the approval key. It MUST NOT be under the unilateral control of the DS operator. It MUST validate G, render every authority-bearing member, and compute C and D itself before invoking the key.

## Proof Profiles {#approval-proof}

A proof binds D to the approval key named in G. This document defines two profiles.

WebAuthn:
: The approval client obtains an assertion {{WEBAUTHN-L3}} with D as the challenge, `allowCredentials` limited to the enrolled credential, and user verification required. The verifier MUST perform the complete assertion verification procedure of {{WEBAUTHN-L3}}, MUST require both the user present and user verified flags, and MUST check that the challenge equals D, that the origin and RP ID are ones it accepts, and that the credential is the one enrolled for the Subject under `approval_key`. The DS MUST retain, and a verifier MUST verify against, the original octets of `clientDataJSON` and `authenticatorData`, the signature, and the credential ID. No party may reserialize `clientDataJSON`.

JWS:
: The approval client produces a JWS {{RFC7515}} whose payload is the octets C, with a protected header containing `typ` with the value `cred-grant-approval+json`, `alg`, and `kid` equal to `approval_key.kid`. The verifier MUST accept only an `alg` on its local allowlist, MUST obtain the key from the enrollment record and never from the JWS, MUST reject a protected header containing `jwk`, `jku`, `x5u`, or `x5c`, and MUST reject the JWS if its payload, validated as G and canonicalized again, is not octet-identical to the payload.

A DS-signed statement that the Subject approved is not a proof under either profile. A CIBA {{OIDC-CIBA}} request MAY be used to reach the Subject's device and run the approval client, but the CIBA result is not a proof; the proof is the assertion or JWS.

## Enrollment and Recovery {#approval-enrollment}

The association between a Subject and an approval key MUST be anchored outside the unilateral control of the DS operator: by an enrollment record the verifier itself pinned, by a statement from identity infrastructure the customer operates, or by a signature from a key previously enrolled for recovery. An enrollment record signed only by the DS is not an anchor.

Each enrollment has an epoch. A rotation to a new key either proves continuity, by a signature from the outgoing key or an enrolled recovery key over the new enrollment, or is recorded as new trust establishment, which a verifier that relies on continuity anchors again before accepting evidence under it.

A verifier that requires root approval evidence MUST reject a grant whose evidence is missing or invalid, uses a profile or algorithm the verifier does not accept, or names an enrollment or epoch the verifier has not anchored. Whether evidence is required is the verifier's policy; the DS cannot waive it.

The DS SHOULD deliver G, the proof, and a reference to the enrollment record to the Subject or to another holder independent of the DS operator when it activates the grant.

## Chain Binding and Activation {#approval-activation}

When a grant carries approval evidence, the DS MUST include D, `consent_id`, `root_jti`, the proof profile, and a digest of the retained evidence in the signed receipt for the root of the chain ({{chain-integrity}}).

Activation MUST be atomic: in one transaction, the DS consumes the pending approval for `consent_id` and `root_jti`, writes the root receipt, initializes cumulative accounting for the consent, and issues the root Delegation Token with `jti` equal to `root_jti`. A second activation for the same `consent_id` or `root_jti` MUST fail. Evidence verified after `approve_by` MUST be rejected.

A Delegation Token reissued under the same consent carries a new `jti` and a DS-signed receipt linking it to `root_jti`, `consent_id`, and D. Cumulative ceilings ({{constraint-ceilings}}) are measured over the consent. Reissuance MUST NOT reset or re-initialize any cumulative total, MUST NOT extend validity beyond `exp`, and MUST NOT change any member of G.

A change that widens `authorization_details`, `constraints`, `redelegation`, or `exp`, or changes `subject`, `account`, `agent`, `ds`, or `tenant`, requires a new approval object and new evidence. Narrowing is ordinary attenuation and requires none.

This section defines no OAuth grant type and does not change the use of {{RFC8693}} in {{sub-delegation-exchange}}. It adds no member to the `agent_delegation` detail of {{ASOR}} or to any token under {{chain-verifiable-profile}}; a verifier of such a token obtains approval evidence through the receipt the DS records under the token's `jti`.
````

### A.3 Custody text for "Architecture Overview"

````markdown
## Custody and Availability {#custody}

The DS is one logical authorization and accounting service. Its custody of credentials and signing keys MAY be tenant-isolated, MAY be hardware-protected, including execution in an attested environment appraised under {{RFC9334}}, and MAY be split across several custodians. No custody arrangement relaxes the authorization, attenuation, revocation, receipt, or cumulative accounting requirements of this document; they apply to the logical DS however many components implement it.

Replicas of a DS MUST serialize admission, revocation, and budget reservation over one logical state. A replica that cannot establish that it is acting on the current state MUST fail closed: it MUST NOT issue a Delegation Token, authorize an exercise, or debit a cumulative total.

An executor that dispatches upstream calls MUST hold a lease or epoch issued by that state, and the DS MUST refuse dispatch and outcome recording by an executor whose lease has been superseded. Upstream effects are not transactional with DS state: the DS reserves budget before dispatch, settles afterwards, and counts an outcome it cannot determine as consumed.
````

### A.4 Security Considerations addition

````markdown
## Root Approval Evidence {#sec-root-approval}

Root approval evidence ({{root-approval}}) lets a party that does not trust the DS operator detect a root grant the Subject's key did not endorse, and attribute a forged one to the DS. It does not prevent misuse. A DS that holds an unrestricted upstream credential can call the resource server with no approval at all, and nothing in the receipt chain records that call. Prevention requires an enforcement boundary independent of the DS: a resource server that checks the approval itself, an upstream credential scoped no wider than the approved grant, or custody arranged so that no single operator can exercise the credential ({{custody}}).

The evidence is no stronger than the approval client, the authenticator, and the enrollment anchor. An approval client the DS operator controls can display one grant and obtain approval of another. A WebAuthn authenticator displays no part of G, so what the Subject saw depends entirely on the approval client. A synced passkey adds the sync provider and its account recovery to the parties trusted. An enrollment the DS can create or rotate on its own reduces the evidence to the DS's own assertion.

The evidence does not show that the Subject understood the grant, or that approval preceded any action the DS took. Timestamps in DS records are DS assertions.

Verifiers MUST validate G before canonicalization ({{approval-commitment}}). Canonicalizing an input that two parties parse differently, for example one with duplicate member names, lets them compute the same digest over different grants.

Retained WebAuthn evidence MUST be kept as the original octets. A verifier that checks a reserialized `clientDataJSON` either rejects valid evidence or verifies a hash computed from data the authenticator never signed.

A DS that resets a cumulative total when it reissues a root token, or that lets two replicas debit the same total from divergent state, defeats ceilings the Subject approved. Totals are measured over the consent, and replicas fail closed when they cannot establish current state.
````

### A.5 Changes from -02 entry

````markdown
- New {{root-approval}}: optional evidence that an independently enrolled, user-controlled key endorsed the exact root grant, by a WebAuthn assertion or JWS over the digest of a closed approval object, bound into the root receipt; no new grant type and no change to the {{ASOR}} format. New {{custody}} in the Architecture Overview and {{sec-root-approval}} in Security Considerations. Re-consent now also follows a change of Agent key. References: {{RFC8785}}, {{RFC7515}}, and {{WEBAUTHN-L3}} normative; {{RFC9334}} and {{PSEA}} informative.
````
