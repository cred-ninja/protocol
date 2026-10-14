# Cred Protocol

A draft credential-custody and exercise contract for agents acting on behalf of users.

The prepared `-01` revision focuses on a Delegation Server that holds upstream
credentials, authorizes the exact requested operation, performs it by proxy,
and produces signed evidence of delegation. Receipts describe decisions at
particular times; current consent, authority, and revocation remain separate checks.

## Scope

- Credential custody with an opaque reference and no upstream secrets returned to agents.
- Proxy exercise constrained by the Subject, actor, operation, resource, and current policy.
- Signed per-hop receipts preserving Subject continuity, actor attribution and time, and authority narrowing.
- Composition with AIMS, WAG, and an explicitly selected authority profile.

The draft's compatibility appendix retains its earlier JWT, DPoP, did:key,
version-negotiation, and CIBA-derived choices. Asor -01 supplies the selected
constraint vocabulary; this draft does not maintain an independent constraint
registry. A mapped vector result is not receipt wire-format interoperability.

This is a local draft for review, not an IETF submission or an SDK release.
The `0.1.0` label does not imply that stable SDK routes implement all appendix
requirements. Wire 0.2.0 and a complete implementation plan remain separate work.

## Repository contents

| File | Purpose |
| --- | --- |
| [Readable -01](draft-sweeney-wimse-credential-delegation-01.md) | Companion generated from the canonical body, with linked references |
| [Canonical -01](ietf/draft-sweeney-wimse-credential-delegation-01.mkd) | kramdown-rfc source of truth |
| [Rendered text](ietf/draft-sweeney-wimse-credential-delegation-01.txt) | Locally regenerated IETF-style preview |
| [IETF artifacts](ietf/README.md) | Build instructions and revision record; -00 artifacts preserved |
| [Conformance](CONFORMANCE.md) | Core/profile checklist and explicit limits of mapped tests |
| [Chain vectors](conformance/asor-delegation-chain/README.md) | Vendored Asor vectors, claim mapping, and retained results |
| [Contributing](CONTRIBUTING.md) | Contribution guidance |

## Implementation status

[Cred SDK](https://github.com/cred-ninja/sdk) implements related custody and
delegation components. Its [capability map](https://github.com/cred-ninja/sdk/blob/main/docs/protocol-conformance.md)
records gaps. DPoP, CIBA, direct token exchange, receipt wire interoperability,
and the profile's 1-second/5-second revocation deadlines need their own evidence
before claiming full conformance.

## License

The specification is available under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
