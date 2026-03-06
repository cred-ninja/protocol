# Protocol Specification Outline

**draft-sweeney-wimse-credential-delegation-00**

This is the specification outline. The full specification is in [`draft-sweeney-wimse-credential-delegation-00.md`](./draft-sweeney-wimse-credential-delegation-00.md).

## Sections

1. [Introduction](#1-introduction)
   - 1.1 Problem Statement (7 gaps in existing standards)
   - 1.2 Relationship to Existing Work
   - 1.3 Design Principles
2. [Terminology](#2-terminology)
3. [Architecture Overview](#3-architecture-overview)
4. [Agent Identity](#4-agent-identity)
   - 4.1 Ephemeral Key Pairs (Ed25519/P-256 + did:key)
   - 4.2 Agent Authentication (JWT Bearer, RFC 7523)
   - 4.3 Agent Lifecycle
5. [Delegation Token Format](#5-delegation-token-format)
   - 5.1 Required Claims
   - 5.2 Capability Structure (RFC 9396 authorization_details)
   - 5.3 Delegation Chain Integrity (prf claim, signed receipts)
6. [Credential Wrapping](#6-credential-wrapping)
   - 6.1 Exercise Flow (/exercise endpoint)
   - 6.2 Proxy Semantics
   - 6.3 Native Support (future)
7. [Revocation](#7-revocation)
   - 1s individual, 5s cascade, synchronous
8. [Consent Flow](#8-consent-flow)
   - 8.1 CIBA-Derived Agent Consent
   - 8.2 Consent Records
   - 8.3 Re-Consent Triggers
9. [Security Considerations](#9-security-considerations)
   - 9.1 Confused Deputy Mitigation
   - 9.2 Delegation Chain Splicing (RFC 8693 §2.1-2.2 vulnerability)
   - 9.3 DPoP Binding
   - 9.4 Prompt Injection Containment
   - 9.5 Chain Depth Limits
   - 9.6 Short-Lived Tokens
10. [IANA Considerations](#10-iana-considerations)
11. [References](#11-references)

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| RFC 8693 as wire protocol | Only standard with act/may_act delegation semantics; production implementations across all major platforms |
| did:key for agent identity | No pre-registration; deterministic from public key; no admin provisioning required |
| DPoP binding (RFC 9449) | Proof-of-possession prevents token theft/replay without changing RS |
| RFC 9396 authorization_details | Capability-shaped (operation + resource + constraints), not identity-scoped |
| Signed prf receipts per hop | Addresses RFC 8693 §2.1-2.2 delegation chain splicing vulnerability |
| /exercise proxy (not token return) | Credentials never cross agent trust boundary; eliminates confused deputy surface |
| CIBA for async consent | Only standard consent flow that works without a redirect URI |
| 15-min default DT lifetime | Limits blast radius; short enough to require frequent re-validation |
| Max chain depth 5 | Bounds revocation cascade complexity |
| No new token formats | Reduces adoption friction; everything maps to existing JWT tooling |
