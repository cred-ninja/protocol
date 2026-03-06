# Cred Protocol

**An open credential delegation protocol for AI agents.**

> **Status:** Pre-submission draft · Targeting IETF WIMSE WG / OAuth WG at IETF 126 (Vienna, July 2026)

---

## The Problem

MCP standardizes agent-to-tool connectivity. A2A standardizes agent-to-agent communication. No open protocol standard governs how credentials flow through these connections.

Every major platform treats agent credential management as the developer's problem: environment variables, hardcoded API keys, or proprietary vendor solutions. The result is that 53% of MCP servers use static long-lived secrets and only 8.5% use OAuth — not because developers prefer this, but because no standard exists.

## What This Protocol Defines

A profile of existing OAuth 2.0 standards that enables:

- **Multi-hop delegation chains** — User → Agent A → Agent B → Agent C, with cryptographic attenuation at each hop
- **Cross-IdP interoperability** — works across Okta, Entra, Google, GitHub, and any OAuth provider
- **Credential wrapping** — agents never see raw credentials; the Delegation Server exercises them on the agent's behalf
- **Synchronous cascading revocation** — revocation propagates in under 5 seconds across the entire delegation tree
- **Capability-shaped tokens** — not "access Google Drive" but "read file X in folder Y until time T with max 10 calls"
- **Ephemeral agent identity** — no pre-registration; agents bootstrap identity from a `did:key` at instantiation

## Protocol Composition

This protocol is a precise profile of existing standards — no new token formats, no new grant types.

| Standard | Role |
|----------|------|
| [RFC 8693](https://www.rfc-editor.org/rfc/rfc8693) | OAuth 2.0 Token Exchange — wire protocol and delegation semantics |
| [RFC 9449](https://www.rfc-editor.org/rfc/rfc9449) | DPoP — proof-of-possession binding |
| [RFC 9396](https://www.rfc-editor.org/rfc/rfc9396) | Rich Authorization Requests — capability structure |
| [RFC 7523](https://www.rfc-editor.org/rfc/rfc7523) | JWT Bearer — agent authentication |
| [OIDC-CIBA](https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html) | Backchannel consent for async/offline agents |
| [W3C did:key](https://w3c-ccg.github.io/did-method-key/) | Ephemeral agent identity without pre-registration |

## Relationship to Active IETF Work

This protocol is designed to **complement** [draft-klrc-aiagent-auth-00](https://datatracker.ietf.org/doc/draft-klrc-aiagent-auth/) (Kasselman, Lombardo, Rosomakho, Campbell — March 2026), which provides a comprehensive AI agent auth framework but explicitly defers delegation protocol mechanics. This specification provides those mechanics.

## Repository Contents

| File | Description |
|------|-------------|
| [`draft-sweeney-wimse-credential-delegation-00.md`](./draft-sweeney-wimse-credential-delegation-00.md) | Full protocol specification |
| [`CONFORMANCE.md`](./CONFORMANCE.md) | Conformance requirements for implementations |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | How to contribute |
| [`IMPLEMENTATIONS.md`](./IMPLEMENTATIONS.md) | Known implementations |

## Reference Implementation

[Cred](https://cred.ninja) is the reference implementation of this protocol — a hosted Delegation Server with SDKs for TypeScript, Python, and MCP.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Issues and pull requests are welcome, particularly from implementers and IETF participants.

## License

The protocol specification is released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
