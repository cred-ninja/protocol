# Contributing to Cred Protocol

We welcome contributions to the protocol specification, conformance requirements, and related materials.

## What We're Looking For

- **Protocol gaps** — scenarios the current spec doesn't address
- **Security analysis** — vulnerabilities, threat models, attack vectors
- **Implementation feedback** — issues encountered building against the spec
- **IETF engagement** — review of related Internet-Drafts, mailing list discussion
- **Second implementations** — the protocol needs more than one implementation to be a standard

## What We're NOT Looking For (Yet)

- Changes to the reference implementation (Cred) — those go to [cred-ninja/cred](https://github.com/cred-ninja/cred)
- New features not grounded in the problem statement
- Alternatives to the RFC 8693 wire protocol (this is settled)

## How to Contribute

1. **Open an issue** describing the gap, bug, or proposal
2. **Reference relevant IETF drafts** if applicable (WIMSE, OAuth WG, etc.)
3. **Submit a PR** against `draft-sweeney-wimse-credential-delegation-00.md`

## Design Principles (Non-negotiable)

These are settled. Don't propose reversing them:

1. **Compose, don't invent** — every mechanism must reuse an existing standard
2. **Credentials never cross the agent trust boundary** — ever
3. **Attenuation is structural** — authority can only narrow at each hop, never widen
4. **Revocation is synchronous** — eventual consistency is not acceptable

## IETF Engagement

The protocol is targeting submission to the IETF WIMSE WG and OAuth WG at IETF 126 (Vienna, July 2026).

If you're active in WIMSE or the OAuth WG and want to engage with this work:
- Subscribe to [wimse@ietf.org](https://www.ietf.org/mailman/listinfo/wimse)
- The draft complements [draft-klrc-aiagent-auth-00](https://datatracker.ietf.org/doc/draft-klrc-aiagent-auth/)

## Code of Conduct

Be direct. Reference specs. No hand-waving. If you claim something is insecure, show the attack.
