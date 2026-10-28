Prepared -02 working copy, 2026-10-15 (wimse sweep). Not submitted. -01 was submitted 2026-10-13 and its artifacts are unchanged.

Inputs this week:
- Songbo Bu's review of -01 on the wimse list, 2026-10-14: https://mailarchive.ietf.org/arch/msg/wimse/qEvDvVG7q2RpzawaiTrpoZ-2AFI/ . Two defects: the Section 4.4 MAY that put WAG `iss`/`sub` inside `act` contradicts the Section 5.1 `client_id`/`act.sub` agreement rule; and RFC 8693 Section 4.3 / RFC 9068 Section 2.2 define `client_id` as the requesting client, while -01 never says who requests a child token.
- draft-asor-wimse-agent-delegation-chain-02, posted 2026-10-15: https://www.ietf.org/archive/id/draft-asor-wimse-agent-delegation-chain-02.txt . Three-form scope grammar, `sub`/`client_id` split, `order` on `rank`, `max_lifetime`/`max_subtree`, closed objects, exactly one `agent_delegation` detail. Cites this draft as the server-side half in Sections 1.1, 8 and 9.4.

Changes:
- Section 4.4: WAG identity travels only as receipt evidence, never in `act`.
- Section 5.1: `client_id` keeps its RFC 8693 meaning (the requester); the DS issues a token only to the agent it names.
- New Section 5.4.1 Sub-Delegation Exchange: authorization step by the delegating agent yields a single-use grant bound to the receiving DID; the receiving agent performs the token exchange under its own key. SETTLED 2026-10-20: Kieran committed to this shape on the wimse list (reply to Songbo, Caleb and Rafael); Caleb Dayton agreed the same day.
- Section 5.3 aligned with asor -02: `order` on wire replaces the registered-ordering rule; closed constraint objects; uniqueness per (key, type); `max` per exercise; `max_lifetime`/`max_subtree` added with the DS as single writer.
- Related Work: the asor paragraph is corrected. -01 claimed either verifier checks the other's chains; asor -02 rejects any detail type other than `agent_delegation` and nests constraints inside it, so the wire formats differ. SETTLED 2026-10-20: Kieran told the list -02 adopts the `agent_delegation` detail for chain-verifiable tokens; see the 2026-10-20 pass below.
- Implementation Status: notes the asor -02 35-vector set is not yet run.
- References: ASOR -02, Nelson -14. Acknowledgments: Songbo Bu.

Validation: kramdown-rfc 1.7.43, xml2rfc 3.34.x via `kdrfc -3`. Before editing, the toolchain rebuilt -01 and reproduced the committed -01 `.txt` byte for byte. The -02 rendered text has no line over 72 columns and is ASCII only. Readable companion `draft-sweeney-wimse-credential-delegation-02.md` at the repo root is generated from the `.mkd`. idnits was not run in this pass.

Submission steps (Kieran only): settle the two decisions above, set `date:`, run `kdrfc -3`, commit, upload the `.xml` at https://datatracker.ietf.org/submit/ before the IETF 127 cutoff, 2026-11-02 23:59 UTC.

Pass of 2026-10-20 (after Kieran's list replies of 2026-10-20 13:02 UTC):
- New Section 5.5 Chain-Verifiable Profile: tokens verified away from the issuing DS, including user-minted ones, use the asor -02 `agent_delegation` format unchanged. A DS MAY issue them (no `cred_delegation`, no top-level `constraints`, opaque provider scopes, mapping recorded in the receipt, no `prf` in the token) and MAY read and check ones it did not issue. Using such a token as the root of a DS chain is stated as -03 work, as Kieran told Caleb.
- Section 7 Revocation: `revoked_count` is invalidation, not closure; the exchanged-token path is partial until expiry unless the RS checks at commit; cascade holds within one DS, cross-domain enforcement out of scope. Both were promised to Watts on the oauth list.
- Section 4.1: ML-DSA MAY alongside Ed25519 and P-256 (MUST accept); every verifier holds a local accepted-algorithm list (asor -02 Section 6 step 1). New informative reference FIPS204.
- Related Work, Nelson paragraph: principal-signed receipts add assurance only with a user-held, user-verified key.
- New Security Considerations 10.8 Long-Term Evidence: classical-signature receipts need anchoring for long retention.
- Implementation Status: SDK at 87eabb7. Conformance re-run 2026-10-20 on Node 22.22.0: -01 set 20 of 20; -02 set 20 of 35, 5 FAIL, 10 GAP (row for row identical to the 2026-10-18 branch run on 5b13213). Results pinned in conformance/asor-delegation-chain/results/.
- Changes from -01 and Acknowledgments updated (Caleb Dayton, Deonte O'dell Watts).
- These close every item under "Fix in Kieran's own -02" in sdk/reports/thread-positions.md.

CHECK BEFORE UPLOAD: Caleb's 2026-10-20 15:10 UTC mail is signed "Caleb Dyer" while his address and the register say Dayton. Confirm the surname for the Acknowledgments and Changes entries.

Build: references fetched from bib.ietf.org are blocked in the cloud container, so the build used a .refcache seeded from the RFC references already in the committed -02 .xml (KRAMDOWN_OFFLINE=1). Before editing, that setup reproduced the committed -02 .txt byte for byte. Rendered text: no line over 72 columns, ASCII only. idnits not run. `date:` still reads 2026-10-15; set it at upload.

Review round, 2026-10-20 (CodeRabbit on cred-ninja/protocol#13): ASOR moved to normative references; Section 5.5 scope bullet now says ASOR classifies scopes by bytes, so a provider string like `crm.read` is literal and the DS must pick strings whose classification admits no more than the mapped capability; Section 7 adds that offline verification of Section 5.5 tokens is outside the DS's revocation bounds; Section 10.8 no longer assumes consent and audit records are signed.

IPR pass, 2026-10-20: policy is to take nothing from patented work. Removed the optional `agent_checksum` claim (Section 4.2), which came from draft-goswami-agentic-jwt, on which a US patent has been filed; Related Work keeps one sentence saying the draft takes nothing from it. Not checked from this container (datatracker blocked): IPR disclosures on the other cited drafts, above all draft-asor-wimse-agent-delegation-chain, which -02 now adopts normatively. Check https://datatracker.ietf.org/ipr/ for each before upload.

Final pre-upload pass, 2026-10-28:
- Toolchain check: kramdown-rfc 1.7.43, xml2rfc 3.34.1, `kdrfc -3` with KRAMDOWN_OFFLINE=1. The committed .refcache lacked RFC 7942 and RFC 9421, so offline builds inserted a broken RFC 9421 reference; both entries are now seeded from the committed -02 .xml and committed (force-added, since `ietf/.refcache/` is in .gitignore). With that cache the build reproduces the -02 .txt of d1cdacc byte for byte. The .txt committed at e478305 does not reproduce: the two edits after d1cdacc (681309f, e478305) were patched into the .txt and .xml by hand without reflowing, so the rebuild in this pass also reflows those two Related Work paragraphs. No wording changed there.
- Related Work, Nelson paragraph and reference: cites draft-nelson-agent-delegation-receipts-15 (dated 2026-10-21), checked on https://datatracker.ietf.org/doc/draft-nelson-agent-delegation-receipts/ in this pass. -15 binds the delegatee by an optional `delegateeKey` that the next signer must match, compared as RFC 7638 thumbprints, with no `delegateeKey` meaning terminal; its Section 4.6 states that key custody is attested by the deployment and cannot be proven from the receipt bytes. The user-held, user-verified key sentence is reworded to rest on that statement. RFC 7638 is named in running text only; no reference entry was added.
- Section 5.5: two sentences saying cumulative ceilings (`max_lifetime`, `max_subtree`, running spend totals) are enforced only where a single writer holds the total; a verifier away from the DS enforces per-exercise ceilings and can hold a cumulative total only for exercises it sees itself; no party holds the total across verifiers.
- Freshness boundary: -02 states no numeric freshness or age limit on receipt as-of times, status age, or consent age (Section 5.4 requires freshness checks without a number; consent records carry a 90-day retention floor, not an age limit). The numeric lifetime caps (assertion `exp` at most iat + 300 s, DT at most 1 hour) are already worded as maximums that admit equality. No change.
- draft-uppalapati-wimse-pq-agent-identity is not cited in -02, so nothing to refresh. No other references added.
- Changes from -01 updated for the Nelson and Section 5.5 edits. `date:` still reads 2026-10-15.
- Rebuilt .xml and .txt; root readable .md mirrored by hand. Rendered text: no line over 72 columns, ASCII only.
- idnits 2.17.1 (from github.com/ietf-tools/idnits, run with gawk) on the .txt: 0 errors, 0 flaws, 5 warnings, 5 comments. Warnings: `MAJOR.MINOR.PATCH` read as an FQDN (false positive); UCAN-SPEC reported unused (it is cited in Acknowledgments); outdated references, later versions exist of draft-asor-wimse-agent-delegation-chain (-03), draft-niyikiza-oauth-attenuating-agent-tokens (-02) and draft-ni-wimse-ai-agent-identity (-04). Comments: document date 13 days old; possible downrefs DID-CORE, DID-KEY, OIDC-CIBA; RFC8693 named in the OAUTH-SPLICING title. The outdated references were left for Kieran: ASOR is normative and -02 adopts its -02 format and vector set, so moving to -03 is not a version bump.

Open for Kieran before upload: per-key mode marker for cumulative bounds; unknown-constraint-type divergence against the asor -02 vector set; the S+L admission bound raised for Section 7; Caleb's surname in Acknowledgments and Changes; whether to move to asor -03 and refresh the niyikiza and ni references; IPR check; `date:`.
