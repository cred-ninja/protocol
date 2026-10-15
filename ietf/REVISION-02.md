Prepared -02 working copy, 2026-10-15 (wimse sweep). Not submitted. -01 was submitted 2026-10-13 and its artifacts are unchanged.

Inputs this week:
- Songbo Bu's review of -01 on the wimse list, 2026-10-14: https://mailarchive.ietf.org/arch/msg/wimse/qEvDvVG7q2RpzawaiTrpoZ-2AFI/ . Two defects: the Section 4.4 MAY that put WAG `iss`/`sub` inside `act` contradicts the Section 5.1 `client_id`/`act.sub` agreement rule; and RFC 8693 Section 4.3 / RFC 9068 Section 2.2 define `client_id` as the requesting client, while -01 never says who requests a child token.
- draft-asor-wimse-agent-delegation-chain-02, posted 2026-10-15: https://www.ietf.org/archive/id/draft-asor-wimse-agent-delegation-chain-02.txt . Three-form scope grammar, `sub`/`client_id` split, `order` on `rank`, `max_lifetime`/`max_subtree`, closed objects, exactly one `agent_delegation` detail. Cites this draft as the server-side half in Sections 1.1, 8 and 9.4.

Changes:
- Section 4.4: WAG identity travels only as receipt evidence, never in `act`.
- Section 5.1: `client_id` keeps its RFC 8693 meaning (the requester); the DS issues a token only to the agent it names.
- New Section 5.4.1 Sub-Delegation Exchange: authorization step by the delegating agent yields a single-use grant bound to the receiving DID; the receiving agent performs the token exchange under its own key. DESIGN DECISION FOR KIERAN: this is the fix the Songbo reply draft commits to. If he prefers a different shape (for example, keep the delegating agent as requester and drop `client_id` agreement), revert this subsection and the Section 5.1 paragraph together.
- Section 5.3 aligned with asor -02: `order` on wire replaces the registered-ordering rule; closed constraint objects; uniqueness per (key, type); `max` per exercise; `max_lifetime`/`max_subtree` added with the DS as single writer.
- Related Work: the asor paragraph is corrected. -01 claimed either verifier checks the other's chains; asor -02 rejects any detail type other than `agent_delegation` and nests constraints inside it, so the wire formats differ. OPEN QUESTION FOR KIERAN: adopt the `agent_delegation` detail shape for chain-verifiable tokens in -02 (restores the interop claim, costs the `cred_delegation` provider/resources fields), or keep separate formats and the corrected text.
- Implementation Status: notes the asor -02 35-vector set is not yet run.
- References: ASOR -02, Nelson -14. Acknowledgments: Songbo Bu.

Validation: kramdown-rfc 1.7.43, xml2rfc 3.34.x via `kdrfc -3`. Before editing, the toolchain rebuilt -01 and reproduced the committed -01 `.txt` byte for byte. The -02 rendered text has no line over 72 columns and is ASCII only. Readable companion `draft-sweeney-wimse-credential-delegation-02.md` at the repo root is generated from the `.mkd`. idnits was not run in this pass.

Submission steps (Kieran only): settle the two decisions above, set `date:`, run `kdrfc -3`, commit, upload the `.xml` at https://datatracker.ietf.org/submit/ before the IETF 127 cutoff, 2026-11-02 23:59 UTC.
