---
title: "Credential Delegation Protocol for AI Agents in Multi-System Environments"
abbrev: "Credential Delegation for AI Agents"
docname: draft-sweeney-wimse-credential-delegation-00
category: std
submissiontype: IETF
ipr: trust200902
area: Security
workgroup: WIMSE Working Group
date: 2026-06-28
keyword:
  - OAuth
  - delegation
  - AI agents
  - capabilities
  - DPoP
stand_alone: yes
pi:
  toc: yes
  sortrefs: yes
  symrefs: yes
  tocdepth: 3

author:
  - ins: K. Sweeney
    name: Kieran Sweeney
    org: Cred
    email: kieran@kierans.net

normative:
  # RFC2119 and RFC8174 are added automatically by the bcp14-tagged boilerplate.
  RFC6749:
  RFC7523:
  RFC8693:
  RFC9396:
  RFC9449:
  DID-KEY:
    title: "The did:key Method v0.7"
    target: https://w3c-ccg.github.io/did-method-key/
    date: 2022
    author:
      - name: Dave Longley
      - name: Dmitri Zagidulin
      - name: Manu Sporny
  OIDC-CIBA:
    title: "OpenID Connect Client-Initiated Backchannel Authentication Flow - Core 1.0"
    target: https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html
    date: 2021-09
    author:
      - org: OpenID Foundation

informative:
  DID-CORE:
    title: "Decentralized Identifiers (DIDs) v1.0"
    target: https://www.w3.org/TR/did-core/
    date: 2022-07
    author:
      - name: Manu Sporny
      - name: Dave Longley
      - name: Drummond Reed
  UCAN-SPEC:
    title: "UCAN Delegation Specification"
    target: https://github.com/ucan-wg/delegation
    date: 2024
    author:
      - name: Brooklyn Zelenka
  CONFUSED-DEPUTY:
    title: "The Confused Deputy (or why capabilities might have been invented)"
    target: https://doi.org/10.1145/54289.871709
    date: 1988
    author:
      - name: Norm Hardy
  MILLER-2006:
    title: "Robust Composition: Towards a Unified Approach to Access Control and Concurrency Control"
    target: http://www.erights.org/talks/thesis/
    date: 2006
    author:
      - name: Mark S. Miller
  KLRC-AIAGENT:
    title: "AI Agent Authentication and Authorization"
    target: https://datatracker.ietf.org/doc/draft-klrc-aiagent-auth/
    date: 2026-03
    seriesinfo:
      Internet-Draft: draft-klrc-aiagent-auth-00
    author:
      - name: Pieter Kasselman
      - name: John Lombardo
      - name: Yaroslav Rosomakho
      - name: Brian Campbell
  WIMSE-AGENT:
    title: "WIMSE Applicability for AI Agents"
    target: https://datatracker.ietf.org/doc/draft-ni-wimse-ai-agent-identity/
    date: 2026-02
    seriesinfo:
      Internet-Draft: draft-ni-wimse-ai-agent-identity-02
    author:
      - name: Yuelei Ni
      - name: Pengfei Liu
  AGENTIC-JWT:
    title: "Secure Intent Protocol for Agentic Systems"
    target: https://datatracker.ietf.org/doc/draft-goswami-agentic-jwt/
    date: 2025-12
    seriesinfo:
      Internet-Draft: draft-goswami-agentic-jwt-00
    author:
      - name: Arjun Goswami
  ECT:
    title: "Execution Context Tokens"
    target: https://datatracker.ietf.org/doc/draft-nennemann-wimse-ect/
    date: 2026-02
    seriesinfo:
      Internet-Draft: draft-nennemann-wimse-ect-00
    author:
      - name: Christine Nennemann
  OWASP-AGENTIC:
    title: "OWASP Top 10 for Agentic Applications v1.0"
    target: https://owasp.org/
    date: 2025-12
    author:
      - org: OWASP
  NIST-AGENT-ID:
    title: "Accelerating the Adoption of Software and AI Agent Identity and Authorization"
    target: https://www.nccoe.nist.gov/
    date: 2026-02
    author:
      - org: NIST NCCoE

--- abstract

Autonomous AI agents increasingly require access to protected resources across
multiple service providers on behalf of human users. Existing OAuth 2.0
extensions address individual aspects of this problem -- token exchange,
proof-of-possession, and structured authorization -- but no current
specification defines how these mechanisms compose into a coherent credential
delegation framework for AI agents.

This document specifies the Credential Delegation Protocol: a profile of OAuth
2.0 Token Exchange (RFC 8693), Demonstrating Proof-of-Possession (RFC 9449),
Rich Authorization Requests (RFC 9396), and Client-Initiated Backchannel
Authentication (OIDC CIBA) that enables human users to delegate scoped,
attenuated credentials to AI agents operating across heterogeneous service
providers.

The protocol defines: agent identity lifecycle management using ephemeral key
pairs; capability-shaped delegation tokens bound to specific operations and
resources; credential wrapping semantics that prevent exposure of underlying
OAuth tokens to agents; consent-gated delegation flows for asynchronous agents;
real-time cascading revocation; and tamper-evident audit chains.

This document does not define new token formats, new OAuth grant types, or
modifications to existing authorization server behavior. It specifies how
existing mechanisms are combined to achieve secure, auditable credential
delegation for AI agents.

--- middle

# Introduction

## Problem Statement

OAuth 2.0 {{RFC6749}} solved human-to-service authorization. When a user
authorizes an application to act on their behalf, the application receives an
access token representing that delegation. This model assumes a human present at
a browser for the consent ceremony.

AI agents operate autonomously. They are ephemeral (spawned on demand), numerous
(many agents per user per service), and adversarially promptable -- a compromised
prompt can direct an agent to misuse any credential it holds. Existing standards
fail the agent delegation use case in seven specific ways:

1. No agent identity primitive. OAuth clients require pre-registration. Agents
   are ephemeral and cannot register at instantiation time. SPIFFE requires
   admin provisioning. No standard defines bootstrapping an agent identity from
   nothing.

2. No delegation chain attenuation. When Agent A sub-delegates to Agent B,
   existing standards do not enforce that authority can only narrow. RFC 8693
   {{RFC8693}} records delegation chains via nested `act` claims but treats them
   as "informational only" -- no enforcement, no structural guarantee. The
   delegation chain splicing vulnerability (disclosed to the OAuth WG mailing
   list, February 26, 2026) demonstrates that RFC 8693 Sections 2.1-2.2 permit a
   compromised intermediary to present mismatched `subject_token` and
   `actor_token` from different delegation contexts, producing a
   properly-signed token asserting a delegation chain that never occurred.

3. No credential wrapping. Agents need to use credentials at resource servers
   that do not understand delegation. No standard defines how a delegation token
   authorizes credential exercise without exposing the raw credential to the
   agent.

4. No granular authorization. OAuth scopes are coarse string identifiers. Agents
   need resource- and operation-level capability binding: not "can access Google
   Drive" but "can read file X in folder Y until time T." RFC 9396 {{RFC9396}}
   provides the structural mechanism but no agent-specific vocabulary or
   attenuation rules.

5. No synchronous revocation cascade. Revoking a root delegation must
   immediately invalidate all derived delegations. UCAN revocation
   {{UCAN-SPEC}} is gossip-based. RFC 8693 explicitly defers revocation to
   implementations. No existing standard provides sub-second cascading
   revocation for a delegation tree.

6. No asynchronous consent. Agent-initiated flows require user approval without a
   redirect URI. CIBA {{OIDC-CIBA}} provides the mechanism but is not profiled
   for agent delegation scenarios, and CIBA + DPoP interaction is
   underspecified.

7. No delegation audit chain. No standard defines an immutable, portable audit
   trail for "Agent A used User B's credential C to perform operation D at time T
   via delegation chain E."

This document profiles existing standards to address all seven gaps. The
problem space and threat model are consistent with industry analyses of agentic
systems {{OWASP-AGENTIC}} {{NIST-AGENT-ID}}.

## Relationship to Existing Work

draft-klrc-aiagent-auth-00 {{KLRC-AIAGENT}} provides a comprehensive framework
for AI agent authentication and authorization. This document provides the
concrete credential delegation protocol mechanics that the framework identifies
as needed but delegates to "use OAuth flows." This specification is designed as
a companion to that work, not a replacement.

draft-ni-wimse-ai-agent-identity-02 {{WIMSE-AGENT}} addresses agent identity
within WIMSE. This protocol's agent identity model (did:key) is compatible with
WIMSE workload identity. This document adds credential wrapping, real-time
revocation, consent gating, and multi-hop chain verification.

draft-goswami-agentic-jwt-00 {{AGENTIC-JWT}}: agent checksums and intent binding
are complementary. An agent checksum MAY appear as a claim in delegation tokens
as defined in {{agent-authentication}}. Note: a US patent has been filed on this
mechanism; this specification adopts the binding concept while avoiding specific
patented mechanisms.

draft-nennemann-wimse-ect-00 {{ECT}}: Execution Context Tokens define an audit
record format. This protocol's audit chain is designed to be ECT-compatible.

## Design Principles

Compose, don't invent. Every mechanism reuses an existing standard. New concepts
appear only where the gaps identified in {{problem-statement}} are confirmed.

Attenuation is structural. Agents cannot widen authority at any delegation hop.
This is enforced by the Delegation Server, not by trusting agents. Inspired by
UCAN attenuation semantics and the object-capability model {{MILLER-2006}}.

Credentials are never possessed. Agents receive and exercise delegated authority
through the Delegation Server. Raw credentials never cross the boundary to the
agent host. This architecturally eliminates the confused deputy attack surface
for credential theft {{CONFUSED-DEPUTY}}.

Revocation is synchronous. A user revoking delegation takes effect within the SLA
defined in {{revocation}}. Eventual consistency is not acceptable for credential
revocation in adversarially-promptable systems.

Capability-shaped, not identity-scoped. Delegation tokens authorize specific
operations on specific resources with specific constraints -- not "Agent X can
access Service Y." Follows the principle that designation equals authority from
capability security.

Chain integrity is cryptographic. Each delegation hop produces a signed receipt.
The chain is verifiable end-to-end without trusting intermediate agents,
addressing the RFC 8693 delegation chain splicing vulnerability.

# Terminology

{::boilerplate bcp14-tagged}

Delegation Server (DS):
: A service that issues, manages, and revokes Delegation Tokens on behalf of
  Subjects. The DS maintains the Credential Vault and enforces delegation
  policies. It acts as an intermediary between Agents and upstream OAuth
  authorization servers.

Agent:
: An autonomous software entity that performs actions on behalf of a Subject
  across one or more service providers. An Agent authenticates to the DS using an
  ephemeral key pair and receives Delegation Tokens authorizing specific
  operations. An Agent MUST NOT possess or have access to the underlying
  credentials stored in the Credential Vault.

Subject:
: The human user who authorizes credential delegation. The Subject
  authenticates to the DS, deposits credentials into the Credential Vault,
  defines delegation policies, and approves or denies consent-gated delegation
  requests.

Delegation Token (DT):
: A signed JWT issued by the DS that authorizes an Agent to perform specified
  operations on specified resources via the DS. A DT contains capability claims
  structured per {{RFC9396}}, a DPoP key binding for proof-of-possession
  verification, and an opaque credential handle. Delegation Tokens MUST NOT
  contain raw OAuth tokens or credentials.

Credential Vault:
: Server-side secure storage maintained by the DS that holds OAuth tokens and
  credentials deposited by Subjects. Credentials are referenced by opaque
  handles and exercised exclusively by the DS on behalf of Agents presenting
  valid Delegation Tokens.

Capability:
: A structured authorization grant specifying a permitted operation, a target
  resource, and optional constraints (time bounds, rate limits, argument
  restrictions). Expressed using the `authorization_details` object defined in
  {{RFC9396}} and bound to a specific Delegation Token.

Attenuation:
: The process by which a Capability is further constrained when delegated from
  one entity to another. An attenuated Capability MUST be a strict subset of its
  parent. Authority can only narrow at each delegation hop; it can never widen.

Delegation Chain:
: An ordered sequence of Delegation Tokens from Subject to Agent_1 to Agent_2 to
  ... to Agent_N, where each link attenuates the authority of the previous. The
  chain is verifiable from any link back to the root consent event via signed
  delegation receipts.

Credential Exercise:
: The act of the DS using a stored credential on behalf of an Agent. The Agent
  presents a valid DT and DPoP proof to the DS, which validates the DT, retrieves
  the credential from the Vault, calls the resource server, and returns only the
  API response.

# Architecture Overview

~~~
                  +--------------------------------------+
                  |            SUBJECT (User)            |
                  |  1. Connects services (OAuth)        |
                  |  2. Sets delegation policies         |
                  |  3. Approves consent requests (CIBA) |
                  +------------------+-------------------+
                                     |
                                     v
+-------------------------------------------------------------+
|                   DELEGATION SERVER (DS)                    |
|                                                             |
|  +-------------+   +-------------+   +-----------------+     |
|  | Credential  |   | Delegation  |   | Consent Manager |     |
|  |   Vault     |   |   Engine    |   |     (CIBA)      |     |
|  | OAuth tokens|   | DT issue    |   | Approve / Deny  |     |
|  | API keys    |   | Attenuation |   | Policy eval     |     |
|  | Refresh tkn |   | Chain vrfy  |   |                 |     |
|  +------+------+   +-------------+   +-----------------+     |
|         |                                                   |
|  +------+--------------------------------------------+      |
|  |                 Exercise Proxy                    |      |
|  |  Validate DT -> Retrieve cred -> Call RS          |      |
|  |  Return API response (never the raw credential)   |      |
|  +---------------------------------------------------+      |
|                                                             |
|  +---------------------------------------------------+      |
|  |               Revocation & Audit                  |      |
|  |  Synchronous cascade  |  Tamper-evident log       |      |
|  +---------------------------------------------------+      |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                          AGENT                              |
|  1. Generates ephemeral did:key                            |
|  2. Authenticates via JWT Bearer (RFC 7523)                |
|  3. Requests delegation (capabilities + constraints)       |
|  4. Receives DT (DPoP-bound, capability-shaped)            |
|  5. Exercises credentials via DS /exercise endpoint        |
|  6. Sub-delegates via attenuation (optional)               |
|                                                             |
|  TRUST BOUNDARY: agent sees DT + API responses only        |
|  Agent NEVER sees: raw tokens, refresh tokens, keys        |
+-------------------------------------------------------------+
~~~
{: #fig-arch title="Credential Delegation Protocol architecture"}

Critical architectural property: the Agent's trust boundary extends only to the
network interface of the Delegation Server. The Agent never crosses into the
Vault. This eliminates credential theft as an attack surface -- there is nothing
for a compromised agent to exfiltrate.

## Protocol Version Negotiation

The canonical protocol version for this draft is `0.1.0`.

HTTP protocol clients MUST advertise the highest Cred Protocol version they
support for a request using the `Cred-Protocol-Version` request header. The
header value MUST be a single semantic-version string in `MAJOR.MINOR.PATCH`
form. Delegation Servers MUST set `Cred-Protocol-Version` on every protocol
response, including error responses, to the version selected by the server for
that response.

Each implementation MUST maintain:

- a supported-version set, ordered from newest to oldest
- a configured version floor, below which requests are rejected

For this draft, the supported-version set is `["0.1.0"]` and the default version
floor is `0.1.0`.

A Delegation Server MUST reject a request that advertises a version lower than
the configured floor or a version outside the supported-version set. The server
MUST return HTTP 426 with a JSON body containing:

~~~ json
{
  "error": "protocol_version_unsupported",
  "message": "Cred Protocol version 0.0.9 is not supported",
  "requested_version": "0.0.9",
  "supported_versions": ["0.1.0"],
  "minimum_version": "0.1.0",
  "current_version": "0.1.0"
}
~~~

The response MUST also include `Cred-Protocol-Version` set to the server's
current version so clients can distinguish protocol drift from authentication,
authorization, or policy failures.

During the `0.1.0` compatibility window, a missing `Cred-Protocol-Version`
request header MAY be treated as `0.1.0`. This allowance exists only because
there is no earlier wire version to downgrade to. Implementations that raise the
version floor above `0.1.0` MUST reject missing protocol-version headers with
`protocol_version_unsupported`.

# Agent Identity

## Ephemeral Key Pairs

An Agent MUST generate an Ed25519 or P-256 key pair at instantiation. The DID is
derived deterministically from the public key using the `did:key` method
{{DID-KEY}}, a concrete profile of the Decentralized Identifier data model
{{DID-CORE}}. No pre-registration is required. The DS MUST NOT reject a DID it
has not seen before.

## Agent Authentication
{: #agent-authentication}

The Agent authenticates to the DS using a JWT Bearer assertion {{RFC7523}}
signed with the private key corresponding to its `did:key`. Required claims:

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
| `agent_checksum` | SHA-256 hash | Intent binding per {{AGENTIC-JWT}}; advisory only due to IPR |

## Agent Lifecycle

Agents SHOULD generate a new key pair per session. The DS MAY require Subject
pre-authorization of specific agent DIDs or agent operators before issuing
Delegation Tokens. When an agent terminates, the DS SHOULD invalidate any active
Delegation Tokens bound to that agent's DPoP key within the revocation SLA.

# Delegation Token Format

A Delegation Token is a DPoP-bound JWT {{RFC9449}} issued by the Delegation
Server.

## Required Claims

| Claim | Value | Specification |
|-------|-------|---------------|
| `iss` | DS identifier | |
| `sub` | Subject identifier | User on whose behalf delegation occurs |
| `act` | `{"sub": "<Agent DID>"}` | Per RFC 8693 Section 4.1 |
| `authorization_details` | Capability array | Per RFC 9396 |
| `cnf` | `{"jkt": "<DPoP thumbprint>"}` | Per RFC 9449 |
| `iat` | Issuance time | |
| `exp` | Expiry time | Max 1 hour; 15 minutes RECOMMENDED |
| `jti` | Unique identifier | |
| `consent_id` | Consent record ID | Traceable to root consent event |
| `credential_handle` | Opaque string | References Vault entry; MUST NOT be the credential itself |

## Capability Structure

Capabilities are expressed as RFC 9396 `authorization_details` objects:

~~~ json
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
~~~

The DS MUST validate that capabilities in a sub-delegation request are a strict
subset of the parent DT's capabilities. Validation is the DS's responsibility,
not the requesting agent's.

## Delegation Chain Integrity

To address the delegation chain splicing vulnerability in RFC 8693 Sections
2.1-2.2, each delegation hop MUST produce a signed delegation receipt
containing: the parent DT's `jti`, the child DT's `jti`, the delegating agent's
DID, the receiving agent's DID, and the attenuated capability set. The receipt
is signed by the DS and included in the child DT as the `prf` claim (an array of
receipt content identifiers). Chain verification traces `prf` links back to the
root consent event.

# Credential Wrapping

## Exercise Flow

The Agent presents a valid DT and DPoP proof to the DS's `/exercise` endpoint.
The DS:

1. Validates the DT signature and expiry
2. Verifies the DPoP binding (`htm`, `htu`, `nonce`)
3. Checks that the requested operation is within the DT's `authorization_details`
4. Retrieves the credential from the Vault using the opaque `credential_handle`
5. Performs the authorized API call against the resource server using the stored
   credential
6. Returns only the API response

The raw credential MUST NOT appear in any agent-facing response.

## Proxy Semantics

For resource servers that accept standard OAuth Bearer tokens: the DS acts as a
reverse proxy, performing the actual API call with the stored credential. The
Agent's HTTP request to `/exercise` specifies the operation and parameters; the
DS maps these to the upstream API call.

## Native Resource Server Support (Future)

For resource servers that natively support this protocol: the DS performs RFC
8693 token exchange, issuing a scoped access token containing the DT's `act`
claim and `authorization_details` for direct presentation at the resource
server. This eliminates the proxy step for participating services.

# Revocation

When a Subject revokes a delegation (root or any subtree node), the DS MUST:

1. Invalidate the specified DT within 1 second
2. Cascade revocation to all descendant DTs within 5 seconds
3. Return HTTP 401 with `error: delegation_revoked` for any in-flight `/exercise`
   request using a revoked DT
4. Write an immutable revocation event to the audit log with a `revocation_time`
   claim

The revocation endpoint is `DELETE /delegation/{jti}`.

The response MUST include a `revoked_count` field indicating the number of tokens
invalidated in the cascade.

# Consent Flow

## CIBA-Derived Agent Consent

When an Agent requests a delegation that exceeds pre-authorized policies, the DS
initiates a CIBA {{OIDC-CIBA}} backchannel authentication request to the Subject.
The Subject approves or denies on their registered device. On approval, the DS
issues the Delegation Token. The Agent polls or receives a push notification when
the token is available.

## Consent Records

The DS MUST store an immutable record of each consent event, including: Subject
identifier, Agent DID, capabilities granted, grant time, expiry, and the full
delegation chain context at time of consent. Records MUST be retained for at
least 90 days.

## Re-Consent Triggers

Consent MUST be re-requested when:

- an Agent requests broader capabilities than previously granted
- the grant has expired
- the `agent_operator` claim changes
- a security event triggers policy re-evaluation

# Security Considerations

## Confused Deputy Mitigation

Capability-shaped tokens eliminate ambient authority. An adversarially-prompted
agent cannot widen its own capabilities since attenuation is DS-enforced. OAuth
access tokens are ambient authority -- any code holding the token exercises its
full scope. For adversarially-promptable agents, this is a structural exploit
vector. Cred delegation tokens are operation-bound, resource-specific, and
constraint-bearing, following the principle that designation should equal
authority {{CONFUSED-DEPUTY}}.

## Delegation Chain Splicing

The mandatory `prf` chain with DS-signed receipts addresses the RFC 8693
Sections 2.1-2.2 vulnerability disclosed to the OAuth WG on February 26, 2026.
Each receipt cross-references parent and child DT `jti` values along with both
agent DIDs, preventing presentation of tokens from mismatched delegation
contexts.

## DPoP Binding

DPoP {{RFC9449}} prevents Delegation Token theft and replay by requiring
cryptographic proof of private key possession on every `/exercise` request. The
proof is bound to the `htm` (HTTP method) and `htu` (URI) of the specific
request, preventing re-use across operations.

## Prompt Injection Containment

Because credentials never reach the agent host, a successful prompt injection
attack cannot exfiltrate credentials. The agent can only exercise capabilities
already granted in its DT, and only via the DS `/exercise` endpoint. The blast
radius of a compromised agent is bounded by its current DT's
`authorization_details`. This containment property directly mitigates the
prompt-injection and excessive-agency risks catalogued in {{OWASP-AGENTIC}}.

## Chain Depth Limits

Implementations SHOULD enforce a maximum delegation chain depth of 5. Unbounded
sub-delegation creates exponential revocation cascades and audit complexity.

## Token Lifetime

The default DT lifetime of 15 minutes limits the blast radius of any single token
compromise. Implementations MUST NOT issue DTs with a lifetime exceeding 1 hour.

# IANA Considerations

This document requests the following registrations.

## OAuth Authorization Details Type

In the "OAuth Authorization Server Metadata" / authorization details type
registry established by {{RFC9396}}:

- Type name: `cred_delegation`
- Description: Capability grant for AI agent credential delegation.

## JWT Claims

In the "JSON Web Token Claims" registry:

- `agent_model`
- `agent_operator`
- `consent_id`
- `credential_handle`
- `prf`

Each claim is defined in this document; change controller IETF.

## OAuth URI

In the "OAuth URI" registry:

- URN: `urn:ietf:params:oauth:grant-type:cred-delegation`
- Description: Credential delegation grant type for AI agents.

--- back
