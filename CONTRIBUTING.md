# Contributing to Cred Protocol

Contributions to the protocol specification are welcome. This is an early-stage draft targeting IETF submission — the most valuable contributions right now are protocol-level analysis, not cosmetic edits.

## What We're Looking For

- **Protocol gaps** — scenarios the current specification doesn't adequately address
- **Security analysis** — vulnerabilities, threat models, attack vectors against the proposed mechanisms
- **Implementation experience** — issues encountered building against the spec; discrepancies between the spec and what's needed in practice
- **IETF engagement** — review of related Internet-Drafts (WIMSE, OAuth WG); mailing list discussion that bears on this work
- **Second implementations** — interoperability requires more than one implementation

## How to Contribute

1. Open an issue describing the gap, concern, or proposal with enough specificity to evaluate it
2. Reference relevant standards and existing IETF drafts where applicable
3. For specification changes, submit a pull request against `draft-sweeney-wimse-credential-delegation-00.md`

Pull requests that improve clarity, fix normative language inconsistencies, or add well-reasoned security analysis are particularly welcome.

## Design Principles

The following decisions are settled. Proposals that revisit them should include new evidence or analysis not present in the current spec:

1. **Compose, don't invent** — every mechanism must reuse an existing standard
2. **Credentials never cross the agent trust boundary** — the proxy model (Section 6) is a core security property
3. **Attenuation is structural** — authority can only narrow at each hop, enforced by the Delegation Server
4. **Revocation is synchronous** — eventual consistency is not acceptable for this threat model

## IETF Context

This draft is targeting the IETF WIMSE WG and OAuth WG. Relevant mailing lists:

- WIMSE: [wimse@ietf.org](https://www.ietf.org/mailman/listinfo/wimse)
- OAuth: [oauth@ietf.org](https://www.ietf.org/mailman/listinfo/oauth)

This specification is designed as a companion to [draft-klrc-aiagent-auth-00](https://datatracker.ietf.org/doc/draft-klrc-aiagent-auth/). Engagement with that document and its authors on the mailing lists is encouraged.
