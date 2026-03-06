# Credential Delegation Protocol for AI Agents in Multi-System Environments

**draft-sweeney-wimse-credential-delegation-00**

Date: 2026-03-06  
Status: Pre-submission consolidation — ready for IETF Internet-Draft formatting  
Target venues: IETF WIMSE WG, OAuth WG, NIST AI Agent Standards Initiative

---

## Abstract

Autonomous AI agents increasingly require access to protected resources across multiple service providers on behalf of human users. Existing OAuth 2.0 extensions address individual aspects of this problem — token exchange, proof-of-possession, and structured authorization — but no current specification defines how these mechanisms compose into a coherent credential delegation framework for AI agents.

This document specifies the Credential Delegation Protocol, a profile of OAuth 2.0 Token Exchange [RFC8693], Demonstrating Proof-of-Possession [RFC9449], Rich Authorization Requests [RFC9396], and Client-Initiated Backchannel Authentication [OIDC-CIBA] that enables human users to delegate scoped, attenuated credentials to AI agents operating across heterogeneous service providers. The protocol defines agent identity lifecycle management using ephemeral key pairs, capability-shaped delegation tokens bound to specific operations and resources, credential wrapping semantics that prevent exposure of underlying OAuth tokens, consent-gated delegation flows, real-time cascading revocation, and tamper-evident audit chains.

This document does not define new token formats, new OAuth grant types, or modifications to existing authorization server behavior. It specifies how existing mechanisms MUST be combined to achieve secure, auditable credential delegation for AI agents.

---

## Part I: Research Consolidation

### Areas of Alignment (Confirmed Across All Research Streams)

Eight parallel research agents, the Phase 1 competitive evaluation, and the enhanced synthesis all converge on the following:

**1. The gap is real and unoccupied.** MCP standardizes agent-to-tool connectivity. A2A standardizes agent-to-agent communication. No open protocol standard governs how credentials flow through these connections. Every source — IETF drafts, NIST concept paper, Auth0/Okta product pages, OWASP agentic security guidance, academic capability security literature — confirms this. The gap is not theoretical; it is the #1 operational pain point for agent developers today.

**2. RFC 8693 is the correct wire protocol.** All research streams independently arrived at OAuth 2.0 Token Exchange as the foundation. Production implementations exist at Microsoft Entra (OBO), Google Cloud (workload identity federation), Keycloak, and Auth0. The act/may_act claims provide delegation semantics. The protocol is deliberately underspecified, which is both its strength (composability) and the gap Cred fills.

**3. The composition approach is sound.** The protocol must be a profile of existing standards, not an invention. Specifically: RFC 8693 (wire protocol) + RFC 9449 (DPoP proof-of-possession) + RFC 9396 (Rich Authorization Requests for capability-shaped permissions) + RFC 7523 (JWT Bearer for agent authentication) + CIBA/RFC 9126 (asynchronous consent) + W3C did:key (ephemeral agent identity) + UCAN attenuation semantics (delegation chain model).

**4. Auth0/Okta is the primary competitive threat, but structurally constrained.** Auth0 Token Vault and Okta XAA are shipping and integrated with LangChain, LlamaIndex, Vercel AI SDK, Cloudflare Agents, and Firebase Genkit. However, both are single-IdP (require Okta), cloud-only (no self-hosted), and proprietary (no open standard). XAA is being positioned as an "open OAuth extension" while maintaining Okta control — a classic embrace-extend-extinguish pattern. Auth0 cannot open-source the protocol without commoditizing their product.

**5. The 12-month window is real.** Okta has a 12-18 month head start on product, but is shipping proprietary solutions. IETF has 19+ active drafts and no consensus. NIST is actively seeking input (deadline: April 2, 2026). The market needs an open standard before vendor lock-in solidifies. Historical base rates confirm: identity standards with major vendor backing succeed in 3-5 years; without backing, 7-10+ years.

**6. Protocol-first is the only viable strategy.** The pattern is HTTP/Apache, OAuth/Auth0, SMTP/Sendmail. The protocol is the moat. Auth0 can clone a product; they cannot destroy an open standard. Every research stream confirms: if Cred is just a product, it loses to Auth0 on distribution. If Cred is a protocol with a reference implementation, it captures the interoperability layer that Auth0 structurally cannot own.

**7. Capability-shaped tokens are mandatory.** 40 years of capability security research (Hardy 1988, Miller 2006, Saltzer & Schroeder 1975) converges: ambient authority is wrong. OAuth access tokens are ambient authority — any code holding the token exercises its full scope. For adversarially-promptable AI agents, this is a guaranteed exploit vector (confused deputy via prompt injection). Cred tokens must be operation-bound, resource-specific, and constraint-bearing.

**8. Credential wrapping is the key architectural innovation.** Raw credentials (OAuth tokens, API keys) must never cross the trust boundary to the agent. The agent receives a delegation token that authorizes the Delegation Server to exercise the credential on the agent's behalf. This is architecturally distinct from every competitor: Auth0 Token Vault stores but returns tokens; Cred wraps and proxies them.

### Areas of New Discovery (Enhanced Synthesis Only)

**1. draft-klrc-aiagent-auth-00 changes the IETF landscape (March 2, 2026).** Published 3 days before this analysis. Authors: Pieter Kasselman (Defakto Security), Jean-François Lombardo (AWS), Yaroslav Rosomakho (Zscaler, WIMSE co-chair), Brian Campbell (Ping Identity). This is the strongest-backed draft in the space — it has a WIMSE co-chair, an AWS representative, and a key Ping Identity standards contributor. It's a 26-page comprehensive framework but delegates delegation to "use OAuth flows" — no specific delegation protocol, no chain verification algorithm, no scope attenuation rules, no revocation mechanism for agent-to-agent credential delegation. This is the gap Cred fills. Cred should position as the concrete delegation protocol that draft-klrc-aiagent-auth identifies as needed.

**2. Delegation chain splicing vulnerability (February 26, 2026).** Disclosed to the OAuth WG mailing list by Chhaya. A compromised intermediary can present mismatched subject_token and actor_token from different delegation contexts. The STS validates each independently and issues a properly-signed token asserting a delegation chain that never occurred. This is a fundamental flaw in RFC 8693 §2.1-2.2. Cred must address this with mandatory cross-validation and per-step signed delegation receipts.

**3. Biscuit tokens solve Macaroon's verification problem.** Biscuit (Eclipse Foundation) uses aggregated signatures (public-key crypto) instead of HMAC chains. Any service with the root public key can verify. Datalog-based authorization policies embedded in the token. Authority facts can only appear in the first block — subsequent blocks can only restrict. Verification under 1ms.

**4. SD-JWT (RFC 9901, November 2025) enables selective disclosure.** An agent could selectively reveal only the scopes needed for the current task, hiding its full authority from the service. EU Digital Identity Wallet mandates SD-JWT VC. Cred delegation tokens as SD-JWT would enable privacy-preserving capability presentation. Key Binding (SD-JWT+KB) prevents token forwarding.

**5. GNAP is architecturally superior but adoption-dead.** RFC 9635 (October 2024) has first-class sub-grant objects for delegation, ephemeral clients, and rich access rights. But the WG has concluded, no major platform supports it, and even GNAP's author (Justin Richer) is blogging about OAuth solutions for agents. Strategic recommendation: build on OAuth, design a clean abstraction layer, reference GNAP concepts as aspirational.

**6. Phase 1 counter-hypothesis is sobering but not disqualifying.** Confidence rating: 3/10 for open protocol wins; 7/10 for proprietary wins. Historical base rates favor proprietary solutions. However, the counter-thesis assumes WIMSE is the only path. Cred's strategy is orthogonal: establish the protocol via running code and developer adoption first, then submit to IETF. The IETF submission is a credibility accelerant, not a dependency.

**7. NIST comment deadline is a high-leverage opportunity.** NIST "Accelerating the Adoption of Software and AI Agent Identity and Authorization" (February 5, 2026). Public comment open through April 2, 2026 to AI-Identity@nist.gov.

**8. MCP security stats validate the problem urgency.** Astrix Security (March 2025): 43% of MCP implementations have command injection flaws. Of ~20,000 MCP servers on GitHub, 88% require credentials but 53% use static long-lived secrets, only 8.5% use OAuth. CVE-2025-55241 (Microsoft Entra ID, July 2025): Critical-severity unsigned actor tokens enabling cross-tenant impersonation.

**9. The MCP token prohibition creates a clean insertion point.** MCP spec (June 2025 revision) explicitly prohibits token pass-through: MCP servers MUST NOT forward tokens received from MCP clients to upstream APIs. The spec does not standardize how MCP servers manage upstream credentials. This is precisely where Cred sits.

---

## Part II: Protocol Specification

### 1. Introduction

#### 1.1 Problem Statement

OAuth 2.0 [RFC6749] solved human-to-service authorization. AI agents operate autonomously — ephemeral, numerous, and adversarially promptable. Existing standards fail the agent delegation use case in seven specific ways:

1. **No agent identity primitive.** OAuth clients require pre-registration. Agents are ephemeral and cannot register at instantiation time. No standard defines bootstrapping an agent identity from nothing.

2. **No delegation chain attenuation.** RFC 8693 records delegation chains via nested `act` claims but treats them as "informational only." The delegation chain splicing vulnerability (disclosed to OAuth WG, February 26, 2026) demonstrates RFC 8693 §2.1-2.2 permits mismatched subject_token and actor_token from different delegation contexts.

3. **No credential wrapping.** No standard defines how a delegation token authorizes credential exercise without exposing the raw credential to the agent.

4. **No granular authorization.** OAuth scopes are coarse string identifiers. Agents need resource- and operation-level capability binding: not "can access Google Drive" but "can read file X in folder Y until time T." RFC 9396 provides the structural mechanism but no agent-specific vocabulary or attenuation rules.

5. **No synchronous revocation cascade.** Revoking a root delegation must immediately invalidate all derived delegations. No existing standard provides sub-second cascading revocation for a delegation tree.

6. **No asynchronous consent.** CIBA [OIDC-CIBA] provides the mechanism but is not profiled for agent delegation scenarios, and CIBA + DPoP interaction is underspecified.

7. **No delegation audit chain.** No standard defines an immutable, portable audit trail for "Agent A used User B's credential C to perform operation D at time T via delegation chain E."

This document profiles existing standards to address all seven gaps.

#### 1.2 Relationship to Existing Work

- **draft-klrc-aiagent-auth-00** (Kasselman, Lombardo, Rosomakho, Campbell, March 2026): Provides a comprehensive framework for AI agent authentication and authorization. This document provides the concrete credential delegation protocol mechanics that the framework identifies as needed but delegates to "use OAuth flows."

- **draft-ni-wimse-ai-agent-identity-02** (Ni, Liu, Huawei, February 2026): Addresses agent identity within WIMSE. This protocol's agent identity model (did:key) is compatible with WIMSE workload identity. This document adds credential wrapping, real-time revocation, consent gating, and multi-hop chain verification.

- **draft-goswami-agentic-jwt-00** (Goswami, December 2025): Agent checksums and intent binding are complementary. An agent checksum MAY appear as a claim in Cred delegation tokens. Note: US patent filed; Cred adopts the binding concept while avoiding specific patented mechanisms.

- **draft-nennemann-wimse-ect-00** (February 2026): Execution Context Tokens define the audit record format. This protocol's audit chain is designed to be ECT-compatible.

#### 1.3 Design Principles

- **Compose, don't invent.** Every mechanism reuses an existing standard.
- **Attenuation is structural.** Agents cannot widen authority at any delegation hop. Enforced by the Delegation Server, not by trusting agents.
- **Credentials are never possessed.** Agents receive and exercise delegated authority through the Delegation Server. Raw credentials never cross the boundary to the agent host.
- **Revocation is synchronous.** A user saying "stop" takes effect within the SLA defined in Section 7.
- **Capability-shaped, not identity-scoped.** Delegation tokens authorize specific operations on specific resources with specific constraints.
- **Chain integrity is cryptographic.** Each delegation hop produces a signed receipt. Addresses the delegation chain splicing vulnerability in RFC 8693.

### 2. Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC2119] [RFC8174].

**Delegation Server (DS):** A service that issues, manages, and revokes Delegation Tokens on behalf of Subjects. Maintains the Credential Vault and enforces delegation policies.

**Agent:** An autonomous software entity that performs actions on behalf of a Subject. Authenticates to the DS using an ephemeral key pair. MUST NOT possess or have access to the underlying credentials stored in the Credential Vault.

**Subject:** The human user who authorizes credential delegation.

**Delegation Token (DT):** A signed JWT issued by the DS that authorizes an Agent to perform specified operations on specified resources via the DS. MUST NOT contain raw OAuth tokens or credentials.

**Credential Vault:** Server-side secure storage maintained by the DS. Credentials referenced by opaque handles and exercised exclusively by the DS.

**Capability:** A structured authorization grant specifying a permitted operation, target resource, and optional constraints. Expressed using RFC 9396 `authorization_details`.

**Attenuation:** The process by which a Capability is further constrained when delegated. An attenuated Capability MUST be a strict subset of its parent.

**Delegation Chain:** An ordered sequence of Delegation Tokens from Subject → Agent_1 → Agent_2 → ... → Agent_N, where each link attenuates the authority of the previous.

**Credential Exercise:** The act of the DS using a stored credential on behalf of an Agent. Agent presents DT + DPoP proof; DS retrieves credential, calls resource server, returns only the API response.

### 3. Architecture Overview

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
│  └──────────────────────────────────────────────────┘│
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
│  5. Exercises via DS /exercise endpoint              │
│  6. Sub-delegates via attenuation (optional)         │
│                                                      │
│  TRUST BOUNDARY: Agent sees DT + API responses only  │
│  Agent NEVER sees: raw tokens, refresh tokens, keys  │
└──────────────────────────────────────────────────────┘
```

**Critical architectural property:** The Agent's trust boundary extends only to the network interface of the Delegation Server. The Agent never crosses into the Vault.

### 4. Agent Identity

#### 4.1 Ephemeral Key Pairs

An Agent MUST generate an Ed25519 or P-256 key pair at instantiation. The DID is derived deterministically from the public key using the did:key method [DID-KEY]. No pre-registration is required. The DS MUST NOT reject a DID it has not seen before.

#### 4.2 Agent Authentication

The Agent authenticates to the DS using a JWT Bearer assertion [RFC7523] signed with the private key corresponding to its did:key.

Required claims:

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
| `agent_checksum` | SHA-256 hash | Per draft-goswami-agentic-jwt (advisory only due to IPR) |

#### 4.3 Agent Lifecycle

Agents SHOULD generate a new key pair per session. The DS MAY require Subject pre-authorization of specific agent DIDs or agent operators before issuing Delegation Tokens. When an agent terminates, the DS SHOULD invalidate any active Delegation Tokens bound to that agent's DPoP key within the revocation SLA.

### 5. Delegation Token Format

A Delegation Token is a DPoP-bound JWT [RFC9449] issued by the Delegation Server.

#### 5.1 Required Claims

| Claim | Value | Specification |
|-------|-------|---------------|
| `iss` | DS identifier | |
| `sub` | Subject identifier | User on whose behalf delegation occurs |
| `act` | Agent DID | Per RFC 8693 §4.1 |
| `authorization_details` | Capability array | Per RFC 9396 |
| `cnf` | `{"jkt": "<DPoP thumbprint>"}` | Per RFC 9449 |
| `iat` | Issuance time | |
| `exp` | Expiry time | Max 1 hour, recommended 15 minutes |
| `jti` | Unique identifier | |
| `consent_id` | Consent record ID | Traceable to root consent event |
| `credential_handle` | Opaque string | References Vault entry; MUST NOT be the credential itself |

#### 5.2 Capability Structure

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

The DS MUST validate that capabilities in a sub-delegation request are a strict subset of the parent DT's capabilities. Validation is the DS's responsibility, never the requesting agent's.

#### 5.3 Delegation Chain Integrity

To address the delegation chain splicing vulnerability, each delegation hop MUST produce a signed delegation receipt containing: the parent DT's `jti`, the child DT's `jti`, the delegating agent's DID, the receiving agent's DID, and the attenuated capability set. The receipt is signed by the DS and included in the child DT as the `prf` claim (an array of receipt CIDs, UCAN-inspired). Chain verification traces `prf` links back to the root consent event.

### 6. Credential Wrapping

#### 6.1 Exercise Flow

The Agent presents a valid DT + DPoP proof to the DS's `/exercise` endpoint. The DS:
1. Validates the DT signature and expiry
2. Verifies the DPoP binding (`htm`, `htu`, `nonce`)
3. Retrieves the credential from the Vault using the opaque `credential_handle`
4. Performs the authorized API call against the resource server using the stored OAuth token
5. Returns only the API response

The raw credential MUST NOT appear in any agent-facing response.

#### 6.2 Proxy Semantics

For resource servers that accept standard OAuth Bearer tokens (all current providers): the DS acts as a reverse proxy, performing the actual API call with the stored credential. The Agent's HTTP request specifies the operation and parameters; the DS maps these to the actual API call.

#### 6.3 Native Support (Future)

For resource servers that support the Cred protocol natively: the DS performs RFC 8693 token exchange, issuing a scoped access token containing the DT's `act` claim and `authorization_details` for direct presentation at the RS.

### 7. Revocation

When a Subject revokes a delegation (root or subtree), the DS MUST:

1. Invalidate the specified DT within **1 second**
2. Invalidate all DTs in the delegation chain descended from the revoked token within **5 seconds**
3. Return HTTP 401 with `error: delegation_revoked` for any in-flight `/exercise` request using a revoked DT
4. Write an immutable revocation event to the audit log with `revocation_time` claim

Revocation API: `DELETE /delegation/{jti}`

The response MUST include a `revoked_count` indicating the number of tokens in the cascade.

### 8. Consent Flow

#### 8.1 CIBA-Derived Agent Consent

When an Agent requests a delegation that exceeds pre-authorized policies, the DS initiates a CIBA backchannel authentication request to the Subject. The Subject approves or denies on their registered device. On approval, the DS issues the Delegation Token.

#### 8.2 Consent Records

The DS MUST store an immutable record of each consent event: Subject identifier, Agent DID, capabilities granted, grant time, expiry, IP address of the requesting agent, and the full delegation chain context. Records MUST be retained for at least 90 days.

#### 8.3 Re-Consent Triggers

Consent MUST be re-requested when: (a) an agent requests broader capabilities than previously granted, (b) the grant has expired, (c) the agent's `agent_operator` claim changes, or (d) a security event triggers policy re-evaluation.

### 9. Security Considerations

**9.1 Confused Deputy Mitigation.** Capability-shaped tokens eliminate ambient authority. An adversarially-prompted agent cannot widen its own capabilities since attenuation is DS-enforced, not agent-enforced. Per OWASP Agentic Applications Top 10 (December 2025): "Critical controls such as privilege separation, authorization bounds checks must not be delegated to the LLM."

**9.2 Delegation Chain Splicing.** The mandatory `prf` chain with DS-signed receipts addresses the RFC 8693 §2.1-2.2 vulnerability. Each receipt cross-references parent and child DTs, preventing mismatched tokens from different delegation contexts.

**9.3 DPoP Binding.** Prevents DT theft and replay by requiring proof of private key possession on every exercise request. DPoP is bound to the `htm` (HTTP method) and `htu` (HTTP URI) of the exercise request.

**9.4 Prompt Injection Containment.** Because credentials never reach the agent, a prompt injection attack that compromises the agent's reasoning cannot exfiltrate credentials. The agent can only exercise capabilities already granted in its DT, and only via the DS exercise endpoint.

**9.5 Chain Depth Limits.** Implementations SHOULD enforce a maximum delegation chain depth of 5.

**9.6 Short-Lived Tokens.** Default DT lifetime of 15 minutes limits the blast radius of any single token compromise.

### 10. IANA Considerations

This document requests registration of:

- `cred_delegation` authorization_details type (RFC 9396 registry)
- `agent_model`, `agent_operator`, `consent_id`, `credential_handle` JWT claim names
- `urn:ietf:params:oauth:grant-type:cred-delegation` grant type URI

### 11. References

#### Normative

- [RFC2119] Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels," March 1997.
- [RFC8174] Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words," May 2017.
- [RFC8693] Jones, M., Nadalin, A., Campbell, B., Bradley, J., Mortimore, C., "OAuth 2.0 Token Exchange," January 2020.
- [RFC9449] Fett, D., Campbell, B., Bradley, J., Lodderstedt, T., Jones, M., Waite, D., "OAuth 2.0 Demonstrating Proof of Possession (DPoP)," September 2023.
- [RFC9396] Lodderstedt, T., Richer, J., Campbell, B., "OAuth 2.0 Rich Authorization Requests," May 2023.
- [RFC9126] Lodderstedt, T., Campbell, B., Sakimura, N., Tonge, D., Fett, F., "OAuth 2.0 Pushed Authorization Requests," September 2021.
- [RFC7523] Jones, M., Campbell, B., Mortimore, C., "JSON Web Token (JWT) Profile for OAuth 2.0 Client Authentication and Authorization Grants," May 2015.
- [DID-CORE] Sporny, M., Longley, D., Chadwick, D., "Decentralized Identifiers (DIDs) v1.0," W3C Recommendation, July 2022.
- [DID-KEY] Longley, D., et al., "The did:key Method v0.7," W3C CCG.
- [OIDC-CIBA] OpenID Foundation, "OpenID Connect Client-Initiated Backchannel Authentication Core 1.0," September 2021.
- [RFC9901] Fett, D., Yasuda, K., Campbell, B., "Selective Disclosure for JWTs (SD-JWT)," November 2025.

#### Informative

- [UCAN-SPEC] Zelenka, B., et al., "UCAN Delegation," ucan-wg/delegation, RC v1.0.
- [CONFUSED-DEPUTY] Hardy, N., "The Confused Deputy," ACM SIGOPS, 1988.
- [MILLER-2006] Miller, M., "Robust Composition," PhD thesis, Johns Hopkins, 2006.
- [KLRC-AIAGENT] Kasselman, P., Lombardo, J., Rosomakho, Y., Campbell, B., "AI Agent Authentication and Authorization," draft-klrc-aiagent-auth-00, March 2026.
- [WIMSE-AGENT] Ni, Y., Liu, P., "WIMSE Applicability for AI Agents," draft-ni-wimse-ai-agent-identity-02, February 2026.
- [AGENTIC-JWT] Goswami, A., "Secure Intent Protocol," draft-goswami-agentic-jwt-00, December 2025.
- [ECT] Nennemann, C., "Execution Context Tokens," draft-nennemann-wimse-ect-00, February 2026.
- [BISCUIT] Geoffroy, C., "Biscuit Authorization Tokens," Eclipse Foundation, 2024.
- [OWASP-AGENTIC] OWASP, "Top 10 for Agentic Applications," December 2025.
- [NIST-AGENT-ID] NIST NCCoE, "Accelerating the Adoption of Software and AI Agent Identity and Authorization," February 2026.

---

## Part III: Submission Timeline & Actions

### Immediate (This Week)

| Action | Deadline | Status |
|--------|----------|--------|
| Submit comment to NIST AI-Identity@nist.gov | April 2, 2026 | Draft ready |
| Subscribe to wimse@ietf.org and oauth@ietf.org | March 7 | Blocked on Kieran |
| Respond to draft-klrc-aiagent-auth-00 on mailing list | March 10 | Draft ready |
| Create cred-ninja/protocol on GitHub | This week | Blocked on Kieran |

### IETF 125 (March 14-20, Shenzhen)

Attend remotely. Observe WIMSE session. Introduce Cred on the mailing list. Do NOT present — listen and identify the gap in discussion that maps to this draft.

### April-May 2026

Draft the full Internet-Draft in IETF XML format (xml2rfc). Engage Pieter Kasselman (Defakto Security) as potential co-author or sponsor. Engage Yaroslav Rosomakho (Zscaler, WIMSE co-chair) for procedural guidance.

### IETF 126 (July 18-24, Vienna)

Submit I-D before the submission deadline (~July 3). Present in WIMSE and/or OAuth session. Target: first formal discussion of the credential delegation gap in a WG session.

### Key Contacts

| Person | Org | Why | How |
|--------|-----|-----|-----|
| Pieter Kasselman | Defakto Security | klrc lead author, nexus of AI agent auth work | GitHub: PieterKas |
| Yaroslav Rosomakho | Zscaler | WIMSE co-chair, klrc co-author | WIMSE mailing list |
| Brian Campbell | Ping Identity | WIMSE contributor, klrc co-author | IETF mailing lists |
| Justin Richer | Bespoke Engineering | GNAP author, delegation expert | jricher@mit.edu |
| Yuan Ni | Huawei | AI agent identity draft author | WIMSE mailing list |

---

*This document consolidates research from 8 parallel Opus agents, a Phase 1 competitive evaluation, an enhanced v2.0 synthesis, and independent live verification conducted on March 6, 2026.*
