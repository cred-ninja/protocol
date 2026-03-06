# Credential Delegation Protocol for AI Agents in Multi-System Environments

**Internet-Draft:** draft-sweeney-wimse-credential-delegation-00  
**Date:** 2026-03-06  
**Intended Status:** Standards Track  
**Target WG:** IETF WIMSE WG / OAuth WG

---

## Abstract

Autonomous AI agents increasingly require access to protected resources across multiple service providers on behalf of human users. Existing OAuth 2.0 extensions address individual aspects of this problem — token exchange, proof-of-possession, and structured authorization — but no current specification defines how these mechanisms compose into a coherent credential delegation framework for AI agents.

This document specifies the Credential Delegation Protocol: a profile of OAuth 2.0 Token Exchange [RFC8693], Demonstrating Proof-of-Possession [RFC9449], Rich Authorization Requests [RFC9396], and Client-Initiated Backchannel Authentication [OIDC-CIBA] that enables human users to delegate scoped, attenuated credentials to AI agents operating across heterogeneous service providers.

The protocol defines: agent identity lifecycle management using ephemeral key pairs; capability-shaped delegation tokens bound to specific operations and resources; credential wrapping semantics that prevent exposure of underlying OAuth tokens to agents; consent-gated delegation flows for asynchronous agents; real-time cascading revocation; and tamper-evident audit chains.

This document does not define new token formats, new OAuth grant types, or modifications to existing authorization server behavior. It specifies how existing mechanisms MUST be combined to achieve secure, auditable credential delegation for AI agents.

---

## 1. Introduction

### 1.1 Problem Statement

OAuth 2.0 [RFC6749] solved human-to-service authorization. When a user authorizes an application to act on their behalf, the application receives an access token representing that delegation. This model assumes a human present at a browser for the consent ceremony.

AI agents operate autonomously. They are ephemeral (spawned on demand), numerous (many agents per user per service), and adversarially promptable — a compromised prompt can direct an agent to misuse any credential it holds. Existing standards fail the agent delegation use case in seven specific ways:

**1. No agent identity primitive.** OAuth clients require pre-registration. Agents are ephemeral and cannot register at instantiation time. SPIFFE requires admin provisioning. No standard defines bootstrapping an agent identity from nothing.

**2. No delegation chain attenuation.** When Agent A sub-delegates to Agent B, existing standards do not enforce that authority can only narrow. RFC 8693 records delegation chains via nested `act` claims but treats them as "informational only" — no enforcement, no structural guarantee. The delegation chain splicing vulnerability (disclosed to the OAuth WG mailing list, February 26, 2026) demonstrates that RFC 8693 §2.1-2.2 permits a compromised intermediary to present mismatched `subject_token` and `actor_token` from different delegation contexts, producing a properly-signed token asserting a delegation chain that never occurred.

**3. No credential wrapping.** Agents need to use credentials at resource servers that do not understand delegation. No standard defines how a delegation token authorizes credential exercise without exposing the raw credential to the agent.

**4. No granular authorization.** OAuth scopes are coarse string identifiers. Agents need resource- and operation-level capability binding: not "can access Google Drive" but "can read file X in folder Y until time T." RFC 9396 provides the structural mechanism but no agent-specific vocabulary or attenuation rules.

**5. No synchronous revocation cascade.** Revoking a root delegation must immediately invalidate all derived delegations. UCAN revocation is gossip-based. RFC 8693 explicitly defers revocation to implementations. No existing standard provides sub-second cascading revocation for a delegation tree.

**6. No asynchronous consent.** Agent-initiated flows require user approval without a redirect URI. CIBA [OIDC-CIBA] provides the mechanism but is not profiled for agent delegation scenarios, and CIBA + DPoP interaction is underspecified.

**7. No delegation audit chain.** No standard defines an immutable, portable audit trail for "Agent A used User B's credential C to perform operation D at time T via delegation chain E."

This document profiles existing standards to address all seven gaps.

### 1.2 Relationship to Existing Work

**draft-klrc-aiagent-auth-00** (Kasselman, Lombardo, Rosomakho, Campbell, March 2026): Provides a comprehensive framework for AI agent authentication and authorization. This document provides the concrete credential delegation protocol mechanics that the framework identifies as needed but delegates to "use OAuth flows." This specification is designed as a companion to that work, not a replacement.

**draft-ni-wimse-ai-agent-identity-02** (Ni, Liu, Huawei, February 2026): Addresses agent identity within WIMSE. This protocol's agent identity model (did:key) is compatible with WIMSE workload identity. This document adds credential wrapping, real-time revocation, consent gating, and multi-hop chain verification.

**draft-goswami-agentic-jwt-00** (Goswami, December 2025): Agent checksums and intent binding are complementary. An agent checksum MAY appear as a claim in delegation tokens as defined in Section 4.2. Note: a US patent has been filed on this mechanism; this specification adopts the binding concept while avoiding specific patented mechanisms.

**draft-nennemann-wimse-ect-00** (Nennemann, February 2026): Execution Context Tokens define an audit record format. This protocol's audit chain is designed to be ECT-compatible.

### 1.3 Design Principles

**Compose, don't invent.** Every mechanism reuses an existing standard. New concepts appear only where the gaps identified in Section 1.1 are confirmed.

**Attenuation is structural.** Agents cannot widen authority at any delegation hop. This is enforced by the Delegation Server, not by trusting agents. Inspired by UCAN attenuation semantics and the object-capability model [MILLER-2006].

**Credentials are never possessed.** Agents receive and exercise delegated authority through the Delegation Server. Raw credentials never cross the boundary to the agent host. This architecturally eliminates the confused deputy attack surface for credential theft [CONFUSED-DEPUTY].

**Revocation is synchronous.** A user revoking delegation takes effect within the SLA defined in Section 7. Eventual consistency is not acceptable for credential revocation in adversarially-promptable systems.

**Capability-shaped, not identity-scoped.** Delegation tokens authorize specific operations on specific resources with specific constraints — not "Agent X can access Service Y." Follows the NORA (designation = authority) principle from capability security.

**Chain integrity is cryptographic.** Each delegation hop produces a signed receipt. The chain is verifiable end-to-end without trusting intermediate agents, addressing the RFC 8693 delegation chain splicing vulnerability.

---

## 2. Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC2119] [RFC8174] when, and only when, they appear in all capitals.

**Delegation Server (DS):** A service that issues, manages, and revokes Delegation Tokens on behalf of Subjects. The DS maintains the Credential Vault and enforces delegation policies. It acts as an intermediary between Agents and upstream OAuth authorization servers.

**Agent:** An autonomous software entity that performs actions on behalf of a Subject across one or more service providers. An Agent authenticates to the DS using an ephemeral key pair and receives Delegation Tokens authorizing specific operations. An Agent MUST NOT possess or have access to the underlying credentials stored in the Credential Vault.

**Subject:** The human user who authorizes credential delegation. The Subject authenticates to the DS, deposits credentials into the Credential Vault, defines delegation policies, and approves or denies consent-gated delegation requests.

**Delegation Token (DT):** A signed JWT issued by the DS that authorizes an Agent to perform specified operations on specified resources via the DS. A DT contains capability claims structured per [RFC9396], a DPoP key binding for proof-of-possession verification, and an opaque credential handle. Delegation Tokens MUST NOT contain raw OAuth tokens or credentials.

**Credential Vault:** Server-side secure storage maintained by the DS that holds OAuth tokens and credentials deposited by Subjects. Credentials are referenced by opaque handles and exercised exclusively by the DS on behalf of Agents presenting valid Delegation Tokens.

**Capability:** A structured authorization grant specifying a permitted operation, a target resource, and optional constraints (time bounds, rate limits, argument restrictions). Expressed using the `authorization_details` object defined in [RFC9396] and bound to a specific Delegation Token.

**Attenuation:** The process by which a Capability is further constrained when delegated from one entity to another. An attenuated Capability MUST be a strict subset of its parent. Authority can only narrow at each delegation hop; it can never widen.

**Delegation Chain:** An ordered sequence of Delegation Tokens from Subject → Agent_1 → Agent_2 → ... → Agent_N, where each link attenuates the authority of the previous. The chain is verifiable from any link back to the root consent event via signed delegation receipts.

**Credential Exercise:** The act of the DS using a stored credential on behalf of an Agent. The Agent presents a valid DT and DPoP proof to the DS, which validates the DT, retrieves the credential from the Vault, calls the resource server, and returns only the API response.

---

## 3. Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    SUBJECT (User)                    │
│  1. Connects services (OAuth)                        │
│  2. Sets delegation policies                         │
│  3. Approves consent requests (CIBA)                 │
└──────────────────┬───────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────┐
│              DELEGATION SERVER (DS)                  │
│                                                      │
│  ┌─────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ Credential  │  │ Delegation │  │   Consent    │  │
│  │   Vault     │  │   Engine   │  │   Manager    │  │
│  │             │  │            │  │   (CIBA)     │  │
│  │ OAuth tokens│  │ DT issue   │  │              │  │
│  │ API keys    │  │ Attenuation│  │ Approve/Deny │  │
│  │ Refresh tkns│  │ Chain vrfy │  │ Policy eval  │  │
│  └──────┬──────┘  └────────────┘  └──────────────┘  │
│         │                                            │
│  ┌──────┴──────────────────────────────────────────┐ │
│  │               Exercise Proxy                    │ │
│  │  Validates DT → Retrieves cred → Calls RS       │ │
│  │  Returns API response (never raw credential)    │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌──────────────────────────────────────────────────┐│
│  │           Revocation & Audit                     ││
│  │  Synchronous cascade  │  Tamper-evident log      ││
│  └──────────────────────────────────────────────────┘│
└──────────────────┬───────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────┐
│                      AGENT                           │
│                                                      │
│  1. Generates ephemeral did:key                      │
│  2. Authenticates via JWT Bearer (RFC 7523)          │
│  3. Requests delegation (capabilities + constraints) │
│  4. Receives DT (DPoP-bound, capability-shaped)      │
│  5. Exercises credentials via DS /exercise endpoint  │
│  6. Sub-delegates via attenuation (optional)         │
│                                                      │
│  TRUST BOUNDARY: Agent sees DT + API responses only  │
│  Agent NEVER sees: raw tokens, refresh tokens, keys  │
└──────────────────────────────────────────────────────┘
```

**Critical architectural property:** The Agent's trust boundary extends only to the network interface of the Delegation Server. The Agent never crosses into the Vault. This eliminates credential theft as an attack surface — there is nothing for a compromised agent to exfiltrate.

---

## 4. Agent Identity

### 4.1 Ephemeral Key Pairs

An Agent MUST generate an Ed25519 or P-256 key pair at instantiation. The DID is derived deterministically from the public key using the `did:key` method [DID-KEY]. No pre-registration is required. The DS MUST NOT reject a DID it has not seen before.

### 4.2 Agent Authentication

The Agent authenticates to the DS using a JWT Bearer assertion [RFC7523] signed with the private key corresponding to its `did:key`. Required claims:

| Claim | Value | Notes |
|-------|-------|-------|
| `iss` | Agent DID | `did:key:z...` |
| `sub` | Agent DID | Same as `iss` |
| `aud` | DS endpoint URL | |
| `iat` | Current time | |
| `exp` | iat + max 300s | 5-minute maximum |
| `jti` | Unique nonce | Prevents replay |

Optional claims:

| Claim | Value | Notes |
|-------|-------|-------|
| `agent_model` | Model identifier | e.g., `"claude-opus-4-6"` |
| `agent_operator` | Operator DID or URL | Organization running the agent |
| `agent_checksum` | SHA-256 hash | Intent binding per [AGENTIC-JWT]; advisory only due to IPR |

### 4.3 Agent Lifecycle

Agents SHOULD generate a new key pair per session. The DS MAY require Subject pre-authorization of specific agent DIDs or agent operators before issuing Delegation Tokens. When an agent terminates, the DS SHOULD invalidate any active Delegation Tokens bound to that agent's DPoP key within the revocation SLA.

---

## 5. Delegation Token Format

A Delegation Token is a DPoP-bound JWT [RFC9449] issued by the Delegation Server.

### 5.1 Required Claims

| Claim | Value | Specification |
|-------|-------|---------------|
| `iss` | DS identifier | |
| `sub` | Subject identifier | User on whose behalf delegation occurs |
| `act` | `{"sub": "<Agent DID>"}` | Per RFC 8693 §4.1 |
| `authorization_details` | Capability array | Per RFC 9396 |
| `cnf` | `{"jkt": "<DPoP thumbprint>"}` | Per RFC 9449 |
| `iat` | Issuance time | |
| `exp` | Expiry time | Max 1 hour; 15 minutes RECOMMENDED |
| `jti` | Unique identifier | |
| `consent_id` | Consent record ID | Traceable to root consent event |
| `credential_handle` | Opaque string | References Vault entry; MUST NOT be the credential itself |

### 5.2 Capability Structure

Capabilities are expressed as RFC 9396 `authorization_details` objects:

```json
{
  "type": "cred_delegation",
  "provider": "google",
  "operations": ["drive.files.get", "drive.files.list"],
  "resources": ["folder:abc123"],
  "constraints": {
    "expires": "2026-03-06T22:00:00Z",
    "max_calls": 10,
    "max_response_size": "10MB"
  }
}
```

The DS MUST validate that capabilities in a sub-delegation request are a strict subset of the parent DT's capabilities. Validation is the DS's responsibility, not the requesting agent's.

### 5.3 Delegation Chain Integrity

To address the delegation chain splicing vulnerability in RFC 8693 §2.1-2.2, each delegation hop MUST produce a signed delegation receipt containing: the parent DT's `jti`, the child DT's `jti`, the delegating agent's DID, the receiving agent's DID, and the attenuated capability set. The receipt is signed by the DS and included in the child DT as the `prf` claim (an array of receipt content identifiers). Chain verification traces `prf` links back to the root consent event.

---

## 6. Credential Wrapping

### 6.1 Exercise Flow

The Agent presents a valid DT and DPoP proof to the DS's `/exercise` endpoint. The DS:

1. Validates the DT signature and expiry
2. Verifies the DPoP binding (`htm`, `htu`, `nonce`)
3. Checks that the requested operation is within the DT's `authorization_details`
4. Retrieves the credential from the Vault using the opaque `credential_handle`
5. Performs the authorized API call against the resource server using the stored credential
6. Returns only the API response

The raw credential MUST NOT appear in any agent-facing response.

### 6.2 Proxy Semantics

For resource servers that accept standard OAuth Bearer tokens: the DS acts as a reverse proxy, performing the actual API call with the stored credential. The Agent's HTTP request to `/exercise` specifies the operation and parameters; the DS maps these to the upstream API call.

### 6.3 Native Resource Server Support (Future)

For resource servers that natively support this protocol: the DS performs RFC 8693 token exchange, issuing a scoped access token containing the DT's `act` claim and `authorization_details` for direct presentation at the resource server. This eliminates the proxy step for participating services.

---

## 7. Revocation

When a Subject revokes a delegation (root or any subtree node), the DS MUST:

1. Invalidate the specified DT within **1 second**
2. Cascade revocation to all descendant DTs within **5 seconds**
3. Return HTTP 401 with `error: delegation_revoked` for any in-flight `/exercise` request using a revoked DT
4. Write an immutable revocation event to the audit log with a `revocation_time` claim

**Revocation endpoint:** `DELETE /delegation/{jti}`

The response MUST include a `revoked_count` field indicating the number of tokens invalidated in the cascade.

---

## 8. Consent Flow

### 8.1 CIBA-Derived Agent Consent

When an Agent requests a delegation that exceeds pre-authorized policies, the DS initiates a CIBA [OIDC-CIBA] backchannel authentication request to the Subject. The Subject approves or denies on their registered device. On approval, the DS issues the Delegation Token. The Agent polls or receives a push notification when the token is available.

### 8.2 Consent Records

The DS MUST store an immutable record of each consent event, including: Subject identifier, Agent DID, capabilities granted, grant time, expiry, and the full delegation chain context at time of consent. Records MUST be retained for at least 90 days.

### 8.3 Re-Consent Triggers

Consent MUST be re-requested when:
- (a) an Agent requests broader capabilities than previously granted
- (b) the grant has expired
- (c) the `agent_operator` claim changes
- (d) a security event triggers policy re-evaluation

---

## 9. Security Considerations

### 9.1 Confused Deputy Mitigation

Capability-shaped tokens eliminate ambient authority. An adversarially-prompted agent cannot widen its own capabilities since attenuation is DS-enforced. OAuth access tokens are ambient authority — any code holding the token exercises its full scope. For adversarially-promptable agents, this is a structural exploit vector. Cred delegation tokens are operation-bound, resource-specific, and constraint-bearing, following the principle that designation should equal authority [CONFUSED-DEPUTY].

### 9.2 Delegation Chain Splicing

The mandatory `prf` chain with DS-signed receipts addresses the RFC 8693 §2.1-2.2 vulnerability disclosed to the OAuth WG on February 26, 2026. Each receipt cross-references parent and child DT `jti` values along with both agent DIDs, preventing presentation of tokens from mismatched delegation contexts.

### 9.3 DPoP Binding

DPoP [RFC9449] prevents Delegation Token theft and replay by requiring cryptographic proof of private key possession on every `/exercise` request. The proof is bound to the `htm` (HTTP method) and `htu` (URI) of the specific request, preventing re-use across operations.

### 9.4 Prompt Injection Containment

Because credentials never reach the agent host, a successful prompt injection attack cannot exfiltrate credentials. The agent can only exercise capabilities already granted in its DT, and only via the DS `/exercise` endpoint. The blast radius of a compromised agent is bounded by its current DT's `authorization_details`.

### 9.5 Chain Depth Limits

Implementations SHOULD enforce a maximum delegation chain depth of 5. Unbounded sub-delegation creates exponential revocation cascades and audit complexity.

### 9.6 Token Lifetime

The default DT lifetime of 15 minutes limits the blast radius of any single token compromise. Implementations MUST NOT issue DTs with a lifetime exceeding 1 hour.

---

## 10. IANA Considerations

This document requests registration of:

- `cred_delegation` as an `authorization_details` type in the OAuth Authorization Server Metadata registry (per RFC 9396)
- `agent_model`, `agent_operator`, `consent_id`, `credential_handle`, `prf` as JWT claim names in the JSON Web Token Claims registry
- `urn:ietf:params:oauth:grant-type:cred-delegation` as a URI in the OAuth Parameters registry

---

## 11. References

### Normative References

- **[RFC2119]** Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels," BCP 14, RFC 2119, March 1997.
- **[RFC8174]** Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words," BCP 14, RFC 8174, May 2017.
- **[RFC8693]** Jones, M., Nadalin, A., Campbell, B., Bradley, J., Mortimore, C., "OAuth 2.0 Token Exchange," RFC 8693, January 2020.
- **[RFC9449]** Fett, D., Campbell, B., Bradley, J., Lodderstedt, T., Jones, M., Waite, D., "OAuth 2.0 Demonstrating Proof of Possession (DPoP)," RFC 9449, September 2023.
- **[RFC9396]** Lodderstedt, T., Richer, J., Campbell, B., "OAuth 2.0 Rich Authorization Requests," RFC 9396, May 2023.
- **[RFC9126]** Lodderstedt, T., Campbell, B., Sakimura, N., Tonge, D., Fett, F., "OAuth 2.0 Pushed Authorization Requests," RFC 9126, September 2021.
- **[RFC7523]** Jones, M., Campbell, B., Mortimore, C., "JSON Web Token (JWT) Profile for OAuth 2.0 Client Authentication and Authorization Grants," RFC 7523, May 2015.
- **[DID-CORE]** Sporny, M., Longley, D., Chadwick, D., "Decentralized Identifiers (DIDs) v1.0," W3C Recommendation, July 2022.
- **[DID-KEY]** Longley, D., et al., "The did:key Method v0.7," W3C CCG Draft.
- **[OIDC-CIBA]** OpenID Foundation, "OpenID Connect Client-Initiated Backchannel Authentication Core 1.0," September 2021.
- **[RFC9901]** Fett, D., Yasuda, K., Campbell, B., "Selective Disclosure for JWTs (SD-JWT)," RFC 9901, November 2025.

### Informative References

- **[UCAN-SPEC]** Zelenka, B., et al., "UCAN Delegation," ucan-wg/delegation, RC v1.0.
- **[CONFUSED-DEPUTY]** Hardy, N., "The Confused Deputy (or Why Capabilities Might Have Been Invented)," ACM SIGOPS Operating Systems Review, 1988.
- **[MILLER-2006]** Miller, M.S., "Robust Composition: Towards a Unified Approach to Access Control and Concurrency Control," PhD thesis, Johns Hopkins University, 2006.
- **[KLRC-AIAGENT]** Kasselman, P., Lombardo, J., Rosomakho, Y., Campbell, B., "AI Agent Authentication and Authorization," draft-klrc-aiagent-auth-00, March 2026.
- **[WIMSE-AGENT]** Ni, Y., Liu, P., "WIMSE Applicability for AI Agents," draft-ni-wimse-ai-agent-identity-02, February 2026.
- **[AGENTIC-JWT]** Goswami, A., "Secure Intent Protocol for Agentic Systems," draft-goswami-agentic-jwt-00, December 2025.
- **[ECT]** Nennemann, C., "Execution Context Tokens," draft-nennemann-wimse-ect-00, February 2026.
- **[OWASP-AGENTIC]** OWASP, "Top 10 for Agentic Applications v1.0," December 2025.
- **[NIST-AGENT-ID]** NIST NCCoE, "Accelerating the Adoption of Software and AI Agent Identity and Authorization," February 2026.

---

*draft-sweeney-wimse-credential-delegation-00*
