# Contributing to Cred Protocol

Contributions to the protocol specification are welcome. This is an early-stage draft targeting IETF submission; the most valuable contributions right now are protocol-level analysis, not cosmetic edits.

## What We're Looking For

- **Protocol gaps**: scenarios the current specification doesn't adequately address
- **Security analysis**: vulnerabilities, threat models, attack vectors against the proposed mechanisms
- **Implementation experience**: issues encountered building against the spec; discrepancies between the spec and what's needed in practice
- **IETF engagement**: review of related Internet-Drafts (WIMSE, OAuth WG); mailing list discussion that bears on this work
- **Second implementations**: interoperability requires more than one implementation

## How to Contribute

1. Open an issue describing the gap, concern, or proposal with enough specificity to evaluate it
2. Reference relevant standards and existing IETF drafts where applicable
3. For specification changes, submit a pull request against the current `ietf/draft-sweeney-wimse-credential-delegation-NN.mkd` (the kramdown-rfc source of truth) and mirror the change in the readable `draft-sweeney-wimse-credential-delegation-NN.md`; regenerate XML and text with `kdrfc -3`

Pull requests that improve clarity, fix normative language inconsistencies, or add well-reasoned security analysis are particularly welcome.

## Design Principles

The following decisions are settled. Proposals that revisit them should include new evidence or analysis not present in the current spec:

1. **Compose, don't invent**: every mechanism must reuse an existing standard
2. **Credentials never cross the agent trust boundary**: the [custody and exercise contract](draft-sweeney-wimse-credential-delegation-01.md#custody) is a core security property
3. **Attenuation is structural**: authority can only narrow at each hop, enforced by the Delegation Server
4. **Revocation is synchronous**: eventual consistency is not acceptable for this threat model

## IETF Context

This draft is targeting the IETF WIMSE WG and OAuth WG. Relevant mailing lists:

- WIMSE: [wimse@ietf.org](https://www.ietf.org/mailman/listinfo/wimse)
- OAuth: [oauth@ietf.org](https://www.ietf.org/mailman/listinfo/oauth)

This specification composes with [AIMS -00](https://www.ietf.org/archive/id/draft-ietf-wimse-aims-00.html) and the explicitly versioned authority and provisioning profiles identified in the current draft. Engagement with that document and its authors on the mailing lists is encouraged.
