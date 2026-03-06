# Cred Protocol

**The open credential delegation protocol for AI agents.**

> **Status:** Pre-submission draft. Targeting IETF WIMSE WG / OAuth WG submission at IETF 126 (Vienna, July 2026).

---

## The Problem

MCP standardizes agent-to-tool connectivity. A2A standardizes agent-to-agent communication. **No open protocol standard governs how credentials flow through these connections.**

Every major platform treats agent credential management as the developer's problem: environment variables, hardcoded API keys, or proprietary vendor solutions that are single-hop, single-IdP, and cloud-only.

## What Cred Protocol Defines

A profile of existing OAuth 2.0 standards that enables:

- **Multi-hop delegation chains** — User → Agent A → Agent B → Agent C with cryptographic attenuation at each hop
- **Cross-IdP interoperability** — works across Okta, Entra, Google, GitHub, any OAuth provider
- **Credential wrapping** — agents never see raw credentials; the Delegation Server exercises them on the agent's behalf
- **Synchronous cascading revocation** — revocation propagates in under 5 seconds across the entire delegation tree
- **Capability-shaped tokens** — not "access Google Drive" but "read file X in folder Y until time T with max 10 calls"
- **Ephemeral agent identity** — no pre-registration; agents bootstrap identity from a did:key at instantiation

## Protocol Composition

This protocol is a profile of:

| Standard | Role |
|----------|------|
| [RFC 8693](https://www.rfc-editor.org/rfc/rfc8693) | OAuth 2.0 Token Exchange — wire protocol |
| [RFC 9449](https://www.rfc-editor.org/rfc/rfc9449) | DPoP — proof-of-possession |
| [RFC 9396](https://www.rfc-editor.org/rfc/rfc9396) | Rich Authorization Requests — capability structure |
| [RFC 7523](https://www.rfc-editor.org/rfc/rfc7523) | JWT Bearer — agent authentication |
| [OIDC-CIBA](https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html) | Backchannel consent for async agents |
| [W3C did:key](https://w3c-ccg.github.io/did-method-key/) | Ephemeral agent identity |

No new token formats. No new grant types. A precise composition of what already exists.

## Relationship to Active IETF Work

This protocol is designed to **complement** [draft-klrc-aiagent-auth-00](https://datatracker.ietf.org/doc/draft-klrc-aiagent-auth/) (Kasselman, Lombardo, Rosomakho, Campbell — March 2026), which provides a comprehensive AI agent auth framework but explicitly defers delegation protocol mechanics to "use OAuth flows." Cred Protocol provides those mechanics.

## Repository Contents

| File | Description |
|------|-------------|
| [`draft-sweeney-wimse-credential-delegation-00.md`](./draft-sweeney-wimse-credential-delegation-00.md) | Full protocol specification (pre-IETF-XML format) |
| [`SPEC.md`](./SPEC.md) | Protocol specification outline |
| [`CONFORMANCE.md`](./CONFORMANCE.md) | Conformance requirements for implementations |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | How to contribute to the protocol |
| [`IMPLEMENTATIONS.md`](./IMPLEMENTATIONS.md) | Known implementations |

## Reference Implementation

[Cred](https://cred.ninja) is the reference implementation of this protocol.

- GitHub: [cred-ninja/cred](https://github.com/cred-ninja/cred)
- Docs: [cred.ninja/docs](https://cred.ninja/docs)
- SDK: `npm install @credninja/sdk` / `pip install cred-auth`

## Status & Timeline

| Milestone | Date | Status |
|-----------|------|--------|
| Research synthesis (8-agent parallel) | March 5, 2026 | ✅ Complete |
| Pre-submission draft | March 6, 2026 | ✅ This document |
| IETF 125 remote attendance | March 14-20, 2026 | Planned |
| NIST comment submission | Before April 2, 2026 | In progress |
| Full xml2rfc Internet-Draft | May 2026 | Planned |
| IETF 126 submission (Vienna) | Before July 3, 2026 | Target |

## Contact

- Protocol questions: [wimse@ietf.org](mailto:wimse@ietf.org) (once subscribed)
- General: [hello@cred.ninja](mailto:hello@cred.ninja)
- GitHub: [@kilroycreative](https://github.com/kilroycreative)

---

*Cred Protocol is developed openly. The reference implementation (Cred) is a commercial product. The protocol is free.*
