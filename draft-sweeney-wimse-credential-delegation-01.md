# Credential Delegation Protocol for AI Agents in Multi-System Environments

**Internet-Draft:** draft-sweeney-wimse-credential-delegation-01

**Document date:** 2026-10-13

**Local revision:** 2026-10-14, not submitted

**Intended status:** Standards Track

Readable companion generated from the canonical `ietf/draft-sweeney-wimse-credential-delegation-01.mkd`. The XML/text preview supplies formal section numbering.

## Abstract

This document specifies a credential-custody and exercise service for agents acting with delegated authority. A Delegation Server retains upstream credentials, checks current authority and policy, and performs permitted resource-server requests on an agent's behalf. Signed delegation receipts bind the delegated subject, actor, effective authority, and provenance; a receipt alone does not establish continuing authorization.

The document describes composition with workload identity, provisioning, and delegation-chain verification. It does not define a general agent identity system, provisioning protocol, or independent attenuation vocabulary. A compatibility profile preserves the previous draft's token, proof, version-negotiation, and consent choices separately from the core service contract.

# Introduction

<a id="problem-statement"></a>

## Problem Statement

An agent may need to use a Subject's existing service credentials without receiving those credentials. The upstream resource server may understand OAuth 2.0 [RFC6749](#ref-rfc6749) but have no knowledge of the agent or its delegation chain. A Delegation Server (DS) bridges that boundary: it retains the credential and permits only those upstream operations covered by current delegated authority.

Custody alone does not authorize an operation. The DS must connect authenticated actor evidence, Subject consent, effective authority, and the credential being used. It must also explain the authority passed at each delegation hop without confusing signed history with current permission. These are the responsibilities specified here.

<a id="scope"></a>

## Scope and Profile Boundary

The core contract covers credential custody, exercise by proxy, signed delegation receipts, and composition with existing identity and authorization mechanisms. Agent provisioning, identity lifecycle design, the authority vocabulary of another delegation format, and direct resource-server token exchange are outside that core.

An interoperable deployment MUST select and document a wire profile, including actor authentication, proof binding, authority representation and comparison, receipt serialization and signature verification, and consent and revocation state. A profile MUST preserve the core requirements; it MUST NOT substitute an identity assertion or a valid historical receipt for current authority. The compatibility profile in [compatibility profile](#compatibility-profile) retains the previous draft's choices for review. Other profiles require their own specification; this document does not define new OAuth grant types.

The compatibility profile is not an assertion that an existing SDK implements every requirement. The version label `0.1.0` does not establish support for DPoP, token exchange, CIBA, or the stated revocation deadlines. This revision neither defines a Wire 0.2.0 implementation nor changes stable SDK routes. See [impl status](#impl-status) for the pinned SDK coverage and limits.

<a id="relationship-to-existing-work"></a>

## Relationship to Existing Work

AIMS [AIMS](#ref-aims) supplies the broader identity and authorization framework. WAG [WAG](#ref-wag) supplies workload provisioning; the custody service uses its evidence only through a trusted identity mapping ([wag composition](#wag-composition)). The agent identifier in a provisioning assertion does not establish Subject consent.

Asor's delegation-chain draft [ASOR](#ref-asor) specifies an authority representation and chain verification. This service checks current authority and manages credential custody and aggregate state. The compatibility profile references Asor -01's constraint vocabulary and subsumption rules rather than maintaining a second registry. Its `cred_delegation` detail, top-level constraints, and receipt representation are not Asor's wire format. Passing vectors through a claim-mapping adapter is evidence for the mapped checks, not interchangeable tokens or receipts. [impl status](#impl-status) records the pinned implementation and vector coverage.

RFC 8693 [RFC8693](#ref-rfc8693) supplies actor attribution semantics. Prior actors recorded in nested `act` claims describe history; they do not independently authorize a new action. Receipt composition must retain both authenticated attribution and the separate authority checks in [chain integrity](#chain-integrity).

# Terminology

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, NOT RECOMMENDED, MAY, and OPTIONAL are interpreted as described in BCP 14 [RFC2119](#ref-rfc2119) [RFC8174](#ref-rfc8174) when, and only when, they appear in all capitals.

**Delegation Server (DS):** The service that holds upstream credentials, issues and revokes delegated authority, verifies receipts, and exercises credentials under current consent and policy.

**Subject:** The human user on whose behalf authority is delegated and who authorizes credential custody and use.

**Agent:** The authenticated software actor requesting delegated authority or its exercise. An Agent MUST NOT possess or have access to the underlying credentials held in the Credential Vault.

**Delegation Token (DT):** The profile-defined presentation of delegated authority accepted by the DS. It identifies the Subject, current actor, permitted operations and resources, applicable constraints and validity, and a custody reference. A DT MUST NOT contain raw upstream credentials. The compatibility profile uses a DPoP-bound JWT.

**Credential Vault:** Server-side storage for upstream credentials, referenced through opaque handles. A handle is a storage reference, not a grant of authority.

**Capability:** An authorization for specified operations on specified resources, with applicable constraints, interpreted under the selected authority profile.

**Attenuation:** Deriving authority contained in the parent's effective authority. A child MUST be equal or narrower, never wider. Equality does not waive consent, freshness, lifetime, or delegation-policy checks.

**Delegation Receipt:** A DS-signed attestation binding one delegation hop's subject, actors, parent and child identifiers, effective authority, and verification time. It is evidence of a delegation decision, not proof that consent remains current or that an upstream operation succeeded.

<a id="custody"></a>

# Credential Custody and Exercise

## Custody Boundary

The DS MUST keep upstream credentials encrypted at rest (AES-256-GCM or equivalent) and reference them by opaque handles. It MUST bind each exercise to the authorized Subject, grant, and Vault entry. Possession or guessability of a handle MUST NOT bypass those checks.

Raw credentials MUST NOT appear in agent-facing tokens, responses, errors, or logs. The DS MUST ensure that its upstream mapping and response handling do not expose a credential through redirects, echoed authentication data, or an unauthorized destination. The Agent receives the permitted API result, never the stored credential.

<a id="exercise-flow"></a>

## Exercise Flow

Before performing an upstream request, the DS MUST:

1. Authenticate the current actor using the selected trusted mechanism and validate the DT's issuer, signature, validity, and applicable proof binding.
2. Resolve the DT and its required receipt chain to the Subject's consent and current delegation state. Verify current authority, permission to act, and revocation status. If a required authority or freshness input is unresolved, deny the exercise.
3. Evaluate the actual requested operation, target resource, and parameters against effective authority and all applicable constraints. Reject an unknown or unevaluable constraint rather than treating it as absent.
4. Enforce stateful limits, including shared lifetime budgets, at the DS. Concurrent exercises MUST NOT each consume the same remaining budget. Offline ceiling comparison is not an aggregate debit.
5. Resolve the authorized custody reference and use the stored credential only for the authorized upstream call. Validation and the call MUST use the same operation, target, and parameters.
6. Return the allowed API response with the custody boundary intact and record the exercise decision without raw credentials.

The DS maps the authorized operation to the upstream API. It MUST NOT treat an arbitrary agent-supplied URL or credential handle as permission to forward a stored credential. Sender constraint alone does not authorize an operation; the compatibility profile's DPoP requirements are in [exercise proof](#exercise-proof).

<a id="revocation"></a>

## Consent and Revocation

Issuance and exercise MUST remain within current Subject consent and DS policy. The DS MUST retain an immutable consent record binding the Subject, actor, capabilities, grant time, expiry, and delegation context. The selected profile specifies the consent interaction and retention period; [consent flow](#consent-flow) retains the previous draft's CIBA-derived choice and 90-day minimum.

Revoking a delegation MUST invalidate its descendants, not only the selected node. The DS MUST enforce revocation during issuance and exercise, reject use of an invalidated delegation, and record an immutable revocation event with its time. A valid signature or receipt chain MUST NOT override revocation. The compatibility profile preserves the existing 1-second root and 5-second descendant deadlines in [profile revocation](#profile-revocation); moving them into that profile does not relax them for a deployment claiming that profile.

A request already sent upstream may have effects that cannot be recalled. Revocation prevents further authorized use; it MUST NOT be represented as rollback of a completed or already-dispatched resource-server operation. A deployment must state how it serializes revocation, exercise admission, and any reserved aggregate budget.

<a id="chain-integrity"></a>

# Delegation Receipts and Composition

## Per-Hop Admission

At every hop, the DS MUST re-verify the parent DT and its signed receipt chain, including issuer trust, signatures, expiry, proof binding, and revocation state, before issuing a child. It MUST establish that the delegator currently holds the authority being delegated and is allowed to delegate it. Signed provenance alone does not establish either condition. If a required authority or freshness check cannot be completed, the DS MUST NOT issue or exercise the child on the basis of that unresolved input.

The child's operations and resources MUST be contained in the parent's effective authority, and its constraints MUST be equal or narrower under the selected authority profile. Independent policies constraining the same action MUST be intersected in an order-independent way. An unrecognized or unevaluable constraint MUST NOT be silently discarded. A child's lifetime MUST NOT exceed the remaining lifetime of its parent or the applicable consent grant.

## Signed Evidence

Each delegation hop MUST produce a DS-signed receipt binding the parent and child DT identifiers, delegating and receiving actors, root Subject, effective capability set and constraints, and any source identity evidence used for the receiving actor. The receipt MUST record the actor attribution verified at that hop and the time it was verified. The receipt chain MUST provide authenticated linkage back to root consent; a profile MUST specify the signed representation and link verification rules so mismatched delegation contexts cannot be spliced together.

Every child MUST preserve the root Subject and identify the receiving, current actor. A verifier reconstructs prior actors from the corresponding per-hop attestations, not by re-deriving them from a later token. Historical attribution MUST NOT independently authorize an action. [profile receipts](#profile-receipts) records the compatibility profile's `sub`, `act`, `jti`, and `prf` mapping.

The DS SHOULD keep, for each hop, an audit record distinct from the receipt that identifies the receipt links, grant and policy inputs, their as-of times and validity horizons, the decision, and any failed or unresolved check with a reason. A verifier MUST have authenticated evidence sufficient to reconstruct the chain to root consent, including per-hop authority narrowing and subject/actor bindings; raw upstream credentials need not be forwarded. Reconstruction does not establish that issuer standing, consent, or revocation state remains current.

The DS MUST keep tamper-evident records of delegation events identifying consent, actor, capabilities, and event time. Logs MUST NOT contain raw credentials or refresh tokens. The detailed policy-input record above is distinct from this event record and from the signed receipt.

<a id="wag-composition"></a>

## Workload Identity and Provisioning

WAG -01 [WAG](#ref-wag) provisions workload authorization at an authorization server. Its assertion is not, by itself, an authentication or consent grant accepted by this custody service. A WAG-provisioned workload still authenticates to the DS using the selected profile and proves the required key possession.

When the DS links WAG identity evidence to an actor, it MUST retain the assertion issuer, Agent Identifier, and any registration-distinguishing claim name and value. WAG Sections 6.1 and 6.3 scope identifiers to the matched Platform registration. The DS MUST NOT equate bare identifiers across registrations; downstream verification requires a trusted mapping of issuer and registration context to the actor.

WAG is a bearer grant and does not establish control of the presenting workload's key. The DS MUST NOT treat WAG identity as proof of possession, Subject consent, or permission to re-delegate. In [compatibility profile](#compatibility-profile), the current actor remains the Agent DID in both `client_id` and `act.sub`; WAG registration context is receipt identity evidence. This profile does not substitute a bare platform-local identifier for that DID.

## Other Authority Formats and Direct Resource Access

A deployment composing with another chain format MUST declare the authority and identity mapping and verify the resulting bindings; matching field names are insufficient. Any unmapped restriction MUST cause denial, not silent loss of authority constraints. The selected format continues to own its vocabulary and verification semantics.

Direct resource-server token exchange is a future composition outside the custody proxy contract. It requires a separate specification for the issued token, audience, holder binding, authority mapping, and revocation. This draft does not authorize forwarding a custody DT or stored credential to an arbitrary third party and makes no implementation claim for such a route.

<a id="impl-status"></a>

# Implementation Status

Note to the RFC Editor: please remove this section and the reference to [RFC7942](#ref-rfc7942) before publication.

This section records the status of known implementations of the protocol defined by this specification at the time of posting of this Internet-Draft, and is based on a proposal described in [RFC7942](#ref-rfc7942). The description of implementations in this section is intended to assist the IETF in its decision processes in progressing drafts to RFCs. Please note that the listing of any individual implementation here does not imply endorsement by the IETF. Furthermore, no effort has been spent to verify the information presented here that was supplied by IETF contributors. This is not intended as, and must not be construed to be, a catalog of available implementations or their features. Readers are advised to note that other implementations may exist.

According to [RFC7942](#ref-rfc7942), "this will allow reviewers and working groups to assign due consideration to documents that have the benefit of running code, which may serve as evidence of valuable experimentation and feedback that have made the implemented protocols more mature. It is up to the individual working groups to use this information as they see fit".

## Cred SDK

**Implementer:** Kieran Sweeney (author of this document)

**Location:** https://github.com/cred-ninja/sdk/tree/09f9488683a38028eacdff5c6a5610b716415536, described here at the pinned commit 09f9488 (2026-10-13). Later commits and local unpublished patches are outside this status snapshot.

**License:** Apache-2.0

**Language:** TypeScript (Node.js)

**Maturity:** Experimental. Brokered paths implement parts of the custody, exercise, and attenuated sub-delegation architecture, with the limits below. The SDK does not meet every core requirement and does not implement the compatibility profile's token, request, or proof-of-possession formats. The version label `0.1.0` and the mapped vector results do not establish conformance to that profile.

**Contact:** kieran@kierans.net

Implemented mechanisms and partial coverage:

- Agent identity ([profile identity](#profile-identity)): Ed25519 key pairs and `did:key` identifiers. P-256 is not implemented.
- Protocol version negotiation ([profile version](#profile-version)): the `Cred-Protocol-Version` header, version `0.1.0`, and HTTP 426 with `protocol_version_unsupported`.
- Credential wrapping ([exercise flow](#exercise-flow)): server brokered paths retain provider tokens and make the upstream call on the agent's behalf. Server sub-delegation always returns a brokered handle. Legacy root delegation defaults to a raw provider token, local SDK delegation and sub-delegation return a token to the calling process, and local MCP may cache it while hiding it from tool output. Link defaults to handles but permits explicit raw issuance under additional checks. The custody guarantee does not apply to every SDK path.
- Sub-delegation with attenuation ([chain integrity](#chain-integrity)): wildcard-aware scope containment, a per-permission depth limit, matching service, user, and application context across hops, and a child expiry bounded by the parent's.
- Constraint ceilings ([constraint ceilings](#constraint-ceilings)): all six types, fail-closed parsing, subsumption per hop, inherit-on-omit, and `rank` labels resolved through a per-key ordering, with an unknown label rejected.
- Signed receipts: the server mints a compact Ed25519 JWS at each hop carrying `client_id` (the agent DID), a commitment to the parent (SHA-256 over the full compact parent receipt), and a signed lineage of ancestor DIDs. Offline chain verification checks signatures, linkage, depth, scope and ceiling subsumption, and expiry ordering. Receipt payloads are decoded as strict JSON: duplicate member names and integers outside the exact range of an IEEE 754 binary64 are rejected.
- Revocation ([revocation](#revocation)): per-agent and per-connection revocation endpoints. Before minting a child, the server checks registered ancestor DIDs in the parent's signed lineage and the parent actor. Missing agent records are allowed; older receipts without lineage do not support the same full-ancestry check. These are issuance checks, not invalidation of already-issued handles.
- Audit: an audit log of delegation, exercise, and revocation events.

Not implemented, or implemented differently:

- Token exchange: delegation and sub-delegation use custom endpoints, not [RFC8693](#ref-rfc8693) token exchange.
- Proof of possession: no DPoP. Agents prove key possession with signed payloads and HTTP Message Signatures [RFC9421](#ref-rfc9421).
- Capabilities: scope strings plus `constraints`, not [RFC9396](#ref-rfc9396) `authorization_details`.
- Agent authentication: opaque bearer tokens plus signed payloads, not an [RFC7523](#ref-rfc7523) assertion.
- Consent: a consent URL the user opens and the agent polls, not CIBA [OIDC-CIBA](#ref-oidc-ciba).
- Complete receipt-chain admission: the parent receipt is verified, but full ancestor receipt-chain verification during child issuance runs only when the caller supplies a nonempty `ancestor_receipts` array. The signed DID lineage used for agent-status checks is not a substitute for re-verifying every ancestor receipt.
- Exercise authority and aggregate state: issuance-time scope containment and constraint ceilings do not establish every-operation enforcement or shared lifetime-budget debits. Google broker scope checks distinguish API families, not all operations within one family; Link Google and Slack scope narrowing may update records without blocking each removed operation. Guard policies may add restrictions but do not establish universal authority mapping.
- Token claims: receipts name the agent in both `sub` and `client_id`; the delegating principal is not yet in `sub`, and there is no `act` or `prf` claim. Changing this mapping requires an agreed wire profile; this status section does not define or approve that change.
- Revocation coverage, interface, and timing: no `DELETE /delegation/{jti}` endpoint or `revoked_count`. Already-issued legacy root and child broker handles retain a cached provider token and do not recheck agent or ancestor records. At this pinned commit, legacy connection deletion removes the vault entry but does not evict these handles or revoke the token at the provider. Link handles recheck their connection, grant, and permission state on later use. Complete cascading invalidation of outstanding handles is not implemented, and the 1-second and 5-second bounds in [profile revocation](#profile-revocation) are not measured by tests.

Conformance results. The SDK's chain validation and sub-delegation checks were run against the twenty interop vectors published with [ASOR](#ref-asor) (attenu-guard v0.9.0) and against four scope-class vectors proposed to that draft's author for its next revision. At commit 09f9488, all twenty and all four pass; four of the twenty pass with a rejection reason that the runner maps to the vector's reason name. The runner, vectors, and pinned results are at https://github.com/cred-ninja/protocol/tree/5a7ca03094cdaef0c410b9931b94a4a3a57da9bd/conformance/asor-delegation-chain. These vectors are chains of HS256 tokens in the [ASOR](#ref-asor) format; the runner checks their signatures and parent hashes itself and maps their claims onto the SDK's hop model. They exercise the scope grammar, constraint subsumption, depth, linkage, expiry ordering, and strict JSON decoding that this document shares with [ASOR](#ref-asor). They do not test any token, receipt, or request format defined in this document.

# Security Considerations

## Credential Exposure and Confused Deputies

Custody reduces exposure of upstream secrets at the agent host. It does not eliminate confused-deputy risk [CONFUSED-DEPUTY](#ref-confused-deputy): the DS is a privileged intermediary, and a compromised agent can still request actions within its granted authority. The DS must bind the actual call to current consent, resource restrictions, and policy. Prompt-injection containment depends on those checks and cannot be inferred from storage architecture alone.

## Receipt Integrity and Freshness

Signed parent-child and subject-actor bindings prevent an untrusted intermediary from substituting an unrelated delegation context when the selected profile's verification succeeds. A receipt is an attestation about a past decision. Missing current authority or revocation evidence MUST cause denial even when all receipt signatures are valid.

<a id="proof-security"></a>

## Proof Binding and Request Integrity

Authentication, sender constraint, and operation authorization are separate checks. In the compatibility profile, DPoP binds the presenting key and token to the request method and URI under [RFC9449](#ref-rfc9449). DPoP does not cover the request body or general headers, so it cannot by itself distinguish two operations carried in the body of the same `/exercise` endpoint. HTTPS and authorization of the exact operation, target, and parameters remain necessary.

## Limits and Model Claims

Implementations SHOULD enforce a maximum chain depth of 5. DT lifetime MUST NOT exceed 1 hour; 15 minutes is RECOMMENDED. Shared aggregate budgets require DS state in addition to any offline receipt checks. A deployment unable to establish required current state MUST fail closed.

The compatibility profile's `agent_model` and `agent_checksum` values are self-asserted metadata. They do not prove a model's identity or integrity and MUST NOT substitute for authenticated actor or authority checks. Runtime attestation is outside this draft.

# IANA Considerations

The custody contract defines no new OAuth grant type. Registration work for the compatibility profile concerns `cred_delegation` as an authorization details type under [RFC9396](#ref-rfc9396) and the additional JWT claims it uses (`agent_model`, `agent_operator`, `consent_id`, `credential_handle`, and `prf`). Complete registration templates and the final receipt representation remain work for a later revision. This section does not claim that those names are registered or that a Wire 0.2.0 contract exists.


<a id="compatibility-profile"></a>

# Compatibility Profile

This appendix preserves the previous draft's concrete JWT, DPoP, did:key, version, and consent choices. Its requirements apply when this profile is selected, in addition to the core contract. It is a draft profile, not a statement of deployed SDK support or completed interoperability. The exact receipt serialization and CIBA/DPoP interaction still require a complete wire specification before implementation or release claims.

<a id="profile-version"></a>

## Protocol Version Negotiation

The retained version label for this compatibility profile is `0.1.0`.

HTTP protocol clients MUST advertise the highest Cred Protocol version they support for a request using the `Cred-Protocol-Version` request header. The header value MUST be a single semantic-version string in `MAJOR.MINOR.PATCH` form. Delegation Servers MUST set `Cred-Protocol-Version` on every protocol response, including error responses, to the version selected by the server for that response.

Each implementation MUST maintain:

- a supported-version set, ordered from newest to oldest
- a configured version floor, below which requests are rejected

For this profile, the supported-version set is `["0.1.0"]` and the default version floor is `0.1.0`.

A Delegation Server MUST reject a request that advertises a version lower than the configured floor or a version outside the supported-version set. The server MUST return HTTP 426 with a JSON body containing:

```json
{
  "error": "protocol_version_unsupported",
  "message": "Cred Protocol version 0.0.9 is not supported",
  "requested_version": "0.0.9",
  "supported_versions": ["0.1.0"],
  "minimum_version": "0.1.0",
  "current_version": "0.1.0"
}
```

The response MUST also include `Cred-Protocol-Version` set to the server's current version so clients can distinguish protocol drift from authentication, authorization, or policy failures.

During the `0.1.0` compatibility window, a missing `Cred-Protocol-Version` request header MAY be treated as `0.1.0`. This allowance exists only because there is no earlier wire version to downgrade to. Implementations that raise the version floor above `0.1.0` MUST reject missing protocol-version headers with `protocol_version_unsupported`.

Clients MUST reject responses selecting a version below their configured floor or outside their supported-version set, and MUST distinguish `protocol_version_unsupported` from authentication, authorization, and policy failures.

<a id="profile-identity"></a>

## Ephemeral Key Pairs

An Agent MUST generate an Ed25519 or P-256 key pair at instantiation. The DID is derived deterministically from the public key using the `did:key` method [DID-KEY](#ref-did-key), a DID method conforming to [DID-CORE](#ref-did-core). The DS MUST NOT reject a DID solely because it has not seen it before. This key-based authentication does not itself establish trust or permission to receive a delegation; Subject consent and DS policy still apply.

<a id="agent-authentication"></a>

## JWT Bearer Authentication

The Agent authenticates to the DS using a JWT Bearer assertion [RFC7523](#ref-rfc7523) signed with the private key corresponding to its `did:key`. Required claims:

| Claim | Value | Notes |
|-------|-------|-------|
| `iss` | Agent DID | `did:key:z...` |
| `sub` | Agent DID | Same as `iss` |
| `aud` | DS endpoint URL | |
| `iat` | Current time | |
| `exp` | iat + max 300s | 5-minute maximum |
| `jti` | Unique nonce | Prevents replay |

*Required authentication claims*

The DS MUST validate the assertion signature and audience, enforce the 300-second maximum lifetime, and reject replayed `jti` values under RFC 7523. A recognized key alone does not authorize issuance.

Optional claims:

| Claim | Value | Notes |
|-------|-------|-------|
| `agent_model` | Model identifier | Vendor-prefixed, e.g., `"vendor:model-id"` |
| `agent_operator` | Operator DID or URL | Organization running the agent |
| `agent_checksum` | SHA-256 hash | Self-asserted metadata; advisory only, see [AGENTIC-JWT](#ref-agentic-jwt) |

*Optional authentication claims*

## Agent Lifecycle

Agents SHOULD generate a new key pair per session. The DS MAY require Subject pre-authorization of specific agent DIDs or agent operators before issuing Delegation Tokens. When an agent terminates, the DS SHOULD invalidate any active Delegation Tokens bound to that agent's DPoP key within the revocation SLA.

<a id="token-claims"></a>

## Delegation Token Claims

A DT in this profile is a DPoP-bound JWT issued by the DS.

| Claim | Value | Specification |
|-------|-------|---------------|
| `iss` | DS identifier | |
| `sub` | Subject identifier | User on whose behalf delegation occurs |
| `client_id` | Agent DID | Acting agent, per [RFC9068](#ref-rfc9068) Section 2.2 and [AIMS](#ref-aims) Section 10.3 |
| `act` | `{"sub": "<Agent DID>"}` | Current actor plus prior-actor history, per RFC 8693, Section 4.1 |
| `authorization_details` | Capability array | Per RFC 9396 |
| `constraints` | Ceiling array | Per-key ceilings in the [ASOR](#ref-asor) Section 4.2 shape; see [constraint ceilings](#constraint-ceilings). OPTIONAL on a root token; REQUIRED on a child whose parent carries any |
| `cnf` | `{"jkt": "<DPoP thumbprint>"}` | Per RFC 9449 |
| `iat` | Issuance time | |
| `exp` | Expiry time | Max 1 hour; 15 minutes RECOMMENDED |
| `jti` | Unique identifier | |
| `consent_id` | Consent record ID | Traceable to root consent event |
| `credential_handle` | Opaque string | References Vault entry; MUST NOT be the credential itself |

*Required Delegation Token claims*

`client_id` and `act.sub` name the same current actor. `client_id` uses the AIMS -00 Section 10.3 convention (acting agent in `client_id`, delegating principal in `sub`); `act` adds the RFC 8693 history trail so a verifier can tell the current actor from prior actors without a second claim set. The two MUST agree; a token in which they differ is malformed.

<a id="capability-structure"></a>

## Capability Representation

Capabilities are expressed as RFC 9396 `authorization_details` objects:

```json
{
  "type": "cred_delegation",
  "provider": "google",
  "operations": ["drive.files.get", "drive.files.list"],
  "resources": ["folder:abc123"],
  "expires": "2026-07-28T22:00:00Z"
}
```

The DS MUST validate that capabilities in a sub-delegation request are a subset of the parent DT's capabilities, equal or narrower, never wider. Validation is the DS's responsibility, not the requesting agent's.

Numeric and enumerated bounds on how a capability may be exercised are not part of the capability object. They are carried in the token's `constraints` claim ([constraint ceilings](#constraint-ceilings)) so that a verifier holding only the chain can check that they narrow hop by hop.

<a id="constraint-ceilings"></a>

## Constraint Profile

The top-level `constraints` claim is OPTIONAL on a root DT and REQUIRED on a child whose parent carries constraints. Its entries use the shape and types in Section 4.2 of draft-asor-wimse-agent-delegation-chain-01 [ASOR](#ref-asor), and comparison uses that version's Section 4.3. This reference is pinned to -01; a later registry or grammar revision is not automatically adopted. This profile does not redefine the six types or adopt Asor's token/receipt wire format.

A claim with a missing, unknown, or multiple type member, malformed value, or repeated `key` is invalid before subsumption is evaluated. The DS and verifier MUST fail closed on an unknown type or an unevaluable value. Every parent constraint MUST remain under the same key and type with equal or narrower admissible values. A child MAY add restrictions; omission from a child token MUST NOT remove a parent's bound. An omitted `constraints` member in a sub-delegation request means the DS inherits the parent's ceilings unchanged.

The DS MUST have a known ordering for every `rank` label it mints and MUST reject an unorderable label. Verifiers MUST fail closed if that ordering is unknown. A bound on aggregate lifetime use requires shared DS accounting under [exercise flow](#exercise-flow); repeating the bound in a child does not create a fresh budget.

<a id="profile-receipts"></a>

## Receipt Claim Mapping

The parent and child identifiers in a receipt are their DT `jti` values. The delegating and receiving actors are their authenticated Agent DIDs. Each child MUST preserve the root Subject in outer `sub` and name the receiving actor in `act.sub`. Prior actors MAY appear as nested `act` under RFC 8693 Section 4.1, for attribution only. The receipt MUST record the `act` value verified at its hop and its verification time.

The DS signs the receipt and includes its content identifier in the child DT's `prf` array. Verifiers MUST authenticate and follow those links to root consent and check the bindings required by [chain integrity](#chain-integrity). A missing link or unverifiable representation MUST cause denial. The exact signed bytes and content-identifier encoding must be specified before claiming receipt wire interoperability; mapped Asor vectors do not establish it.

<a id="exercise-proof"></a>

## Exercise Proof

The Agent presents its DT and a DPoP proof to `/exercise`. The DS MUST apply RFC 9449 Sections 4.3 and 7 checks, including proof signature and type, method/URI matching, freshness and replay handling, nonce validation when required, `ath` access-token binding, and the `cnf.jkt` key match. HTTPS is REQUIRED. Failure of any required check denies exercise. The DS then performs the authorization and custody checks in [exercise flow](#exercise-flow); DPoP is not a substitute for them.

<a id="profile-revocation"></a>

## Revocation Timing and Response

When a Subject revokes a delegation (root or any subtree node), the DS MUST:

1. Invalidate the specified DT within **1 second**
2. Cascade revocation to all descendant DTs within **5 seconds**
3. Return HTTP 401 with `error: delegation_revoked` for any in-flight `/exercise` request using a revoked DT
4. Write an immutable revocation event to the audit log with a `revocation_time` claim

**Revocation endpoint:** `DELETE /delegation/{jti}`

The response MUST include a `revoked_count` field indicating the number of tokens invalidated in the cascade.

These deadlines are retained requirements, not measured SDK guarantees. An error returned for an in-flight request does not prove that an already-dispatched upstream action was undone ([revocation](#revocation)).

<a id="consent-flow"></a>

## Consent Composition

When an Agent requests a delegation that exceeds pre-authorized policies, the DS initiates a CIBA [OIDC-CIBA](#ref-oidc-ciba) backchannel authentication request to the Subject. The Subject approves or denies on their registered device. On approval, the DS issues the Delegation Token. The Agent polls or receives a push notification when the token is available.

## Consent Records

The DS MUST store an immutable record of each consent event, including: Subject identifier, Agent DID, capabilities granted, grant time, expiry, and the full delegation chain context at time of consent. Records MUST be retained for at least 90 days.

## Re-Consent Triggers

Consent MUST be re-requested when:

1. an Agent requests broader capabilities than previously granted
2. the grant has expired
3. the `agent_operator` claim changes
4. a security event triggers policy re-evaluation

This preserves the previous CIBA-derived composition. It does not supply missing endpoint, polling/push, or DPoP interaction details; those remain necessary before a complete interoperable wire profile can be claimed.

# Changes from -00

- Narrow the core to custody, proxy exercise, receipts, and composition. Move fixed identity, token, version, and CIBA choices into [compatibility profile](#compatibility-profile).
- Retain per-hop current-authority checks, Subject continuity, authenticated actor attribution and verification time, monotonic narrowing, receipt linkage, and separate freshness checks.
- Use equal-or-narrower authority consistently; retain profile revocation deadlines, consent retention, and token lifetime limits.
- Reference Asor -01 for constraint semantics as a normative profile dependency; distinguish mapped conformance results from receipt wire interoperability.
- Retain WAG issuer and Platform-registration context without treating provisioning as proof of possession or Subject consent.
- Clarify DPoP request-integrity limits and remove the unused proposed OAuth grant-type registration.

- Add [impl status](#impl-status) per [RFC7942](#ref-rfc7942), retaining the upstream pinned 20+4 mapped-vector results and distinguishing partial SDK coverage from the core and compatibility-profile requirements.
- Retain the October 13 document date and refreshed [AGENTIC-JWT](#ref-agentic-jwt) reference from the broader draft; the removed related-work survey remains outside the narrowed scope.

# Acknowledgments

The design draws on UCAN delegation [UCAN-SPEC](#ref-ucan-spec) and the object-capability literature [MILLER-2006](#ref-miller-2006). Rafael Asor's delegation-chain work supplied the selected constraint vocabulary; Iman Schrock identified a scope-class defect; Wes Jackson contributed the per-hop actor-attestation framing.

# References

<a id="ref-rfc6749"></a>

**RFC6749:** [RFC6749](https://www.rfc-editor.org/rfc/rfc6749.html)

<a id="ref-rfc8693"></a>

**RFC8693:** [RFC8693](https://www.rfc-editor.org/rfc/rfc8693.html)

<a id="ref-rfc9068"></a>

**RFC9068:** [RFC9068](https://www.rfc-editor.org/rfc/rfc9068.html)

<a id="ref-rfc9449"></a>

**RFC9449:** [RFC9449](https://www.rfc-editor.org/rfc/rfc9449.html)

<a id="ref-rfc9396"></a>

**RFC9396:** [RFC9396](https://www.rfc-editor.org/rfc/rfc9396.html)

<a id="ref-rfc7523"></a>

**RFC7523:** [RFC7523](https://www.rfc-editor.org/rfc/rfc7523.html)

<a id="ref-did-core"></a>

**DID-CORE:** [Decentralized Identifiers (DIDs) v1.0](https://www.w3.org/TR/did-core/)

<a id="ref-did-key"></a>

**DID-KEY:** [The did:key Method v0.7](https://w3c-ccg.github.io/did-method-key/)

<a id="ref-oidc-ciba"></a>

**OIDC-CIBA:** [OpenID Connect Client-Initiated Backchannel Authentication Flow - Core 1.0](https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html)

<a id="ref-asor"></a>

**ASOR:** [Verifiable Attenuated Delegation for AI Agent Chains](https://www.ietf.org/archive/id/draft-asor-wimse-agent-delegation-chain-01.html)

<a id="ref-rfc7942"></a>

**RFC7942:** [RFC7942](https://www.rfc-editor.org/rfc/rfc7942.html)

<a id="ref-rfc9421"></a>

**RFC9421:** [RFC9421](https://www.rfc-editor.org/rfc/rfc9421.html)

<a id="ref-ucan-spec"></a>

**UCAN-SPEC:** [UCAN Delegation](https://github.com/ucan-wg/delegation)

<a id="ref-confused-deputy"></a>

**CONFUSED-DEPUTY:** The Confused Deputy (or Why Capabilities Might Have Been Invented)

<a id="ref-miller-2006"></a>

**MILLER-2006:** Robust Composition: Towards a Unified Approach to Access Control and Concurrency Control

<a id="ref-wag"></a>

**WAG:** [Workload Authorization Grant](https://www.ietf.org/archive/id/draft-carleton-workload-authz-grant-01.html)

<a id="ref-aims"></a>

**AIMS:** [AI Identity Management System](https://www.ietf.org/archive/id/draft-ietf-wimse-aims-00.html)

<a id="ref-agentic-jwt"></a>

**AGENTIC-JWT:** [Secure Intent Protocol: JWT Compatible Agentic Identity and Workflow Management](https://datatracker.ietf.org/doc/draft-goswami-agentic-jwt/)

<a id="ref-rfc2119"></a>

**RFC2119:** [RFC2119](https://www.rfc-editor.org/rfc/rfc2119.html)

<a id="ref-rfc8174"></a>

**RFC8174:** [RFC8174](https://www.rfc-editor.org/rfc/rfc8174.html)
