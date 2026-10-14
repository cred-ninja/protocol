## Reconciled local revision — 2026-10-14

This local revision has not been submitted. Reconciled the narrowed core with
protocol main 5a7ca03 after preserving the earlier eight-file patch in a local
checkpoint commit. Retain main's October 13 document date; it is not evidence of
submission. Historical notes below describe earlier versions, not current section
numbers or a send/upload instruction executed by this revision.

- Keep custody, proxy exercise, signed receipts, and composition in the core and
  the existing wire choices in Appendix A. Preserve all prior normative limits.
- Retain upstream Implementation Status and RFC 7942/RFC 9421 references, with
  links adjusted to the narrowed profile. Status is pinned to SDK 09f9488 and
  excludes unpublished local patches. Clarify raw/broker/Link custody, operation
  mapping, aggregate-state and revocation limits from local source audits.
- Preserve upstream conformance results (20 Asor and 4 proposed scope vectors)
  byte-for-byte. They test mapped chain checks, not this draft's wire formats.
- Retain the updated Goswami -01 metadata. The broader related-work survey and
  references used only there remain removed; their newer metadata is preserved
  in main's history and the merge evidence, not reintroduced as unused references.
- Regenerate readable, XML and text companions from canonical source using
  kramdown-rfc 1.7.39 and xml2rfc 3.34.0. Date is read from canonical metadata.
  Local document checks and preservation evidence are saved with the scheduled
  run. No SDK runtime edits, remote push, standards submission or correspondence.

## Earlier local narrowing notes

## Local narrowing revision — 2026-10-13

This local revision is prepared for review and has not been submitted. Earlier
notes below record the broader October 6–7 draft and are historical.

- Core now covers custody, proxy exercise, signed receipts, and composition;
  fixed JWT/DPoP/did:key/version/CIBA choices are in Appendix A.
- Preserve current authority/freshness and per-hop proof checks, Subject
  continuity, actor verification times, authenticated linkage, equal-or-narrower
  authority, fail-closed constraints, and DS accounting for shared budgets.
- Preserve Appendix A's 1-second/5-second revocation deadlines, 90-day consent
  retention, and existing token/version labels without asserting SDK support.
- Reference Asor -01 Sections 4.2/4.3 as a normative profile dependency instead
  of copying its type registry. Remove universal receipt-interop claims.
- Correct the strict-subset terminology contradiction and DPoP body-integrity
  overstatement. WAG registration evidence remains distinct from DID actor
  attribution, possession, and Subject consent.
- Direct resource-server exchange remains future profile work. Remove the
  unused grant-type registration proposal. Receipt encoding, CIBA/DPoP details,
  and complete registration templates still need specification.
- Readable companion synchronized from canonical source. Old source rendered
  with kramdown-rfc 1.7.39 (Ruby 4.0.7) and xml2rfc 3.34.0 reproduces the old
  text byte-for-byte; XML differs only in its generator-version comment.
  Revised XML/text regenerated with the same tools. The retained October 6
  document date produces an expected age warning; it is not a submission date
  change. All -00 artifacts remain unchanged.

## Historical preparation notes

Prepared -01, 2026-10-06

- .mkd remains the filing source of truth; new readable .md and XML companions are included, preserving all -00 artifacts.
- Refresh AIMS reference and add WAG -01 as the provisioning composition target.
- Require per-hop re-verification, current delegation authority, monotonic narrowing, root subject continuity and accurate actor attribution, and reconstructable signed evidence.
- Use RFC 8693 act for attribution in receipts; nested actors do not grant authority.
- Preserve WAG Section 6.1 matched registration scope, including issuer and required partition context.
- 2026-10-06 review pass: WAG-provisioned workloads still authenticate per Agent Authentication and `act.sub` stays the Agent DID; WAG identity travels as receipt identity evidence (or `act` `iss`+`sub` per RFC 8693 4.1); WAG bearer status noted, PoP comes from the DT's DPoP binding; receipt content list now includes root subject and identity evidence; per-hop audit record is SHOULD and distinct from the receipt; sub-delegation subset rule reads equal-or-narrower; AIMS reference lists A. Parecki; Carleton marked editor.

Validation: regenerated the XML and rendered text from the canonical `.mkd` with kramdown-rfc 1.7.43 and xml2rfc 3.34.1 using `kdrfc -3`. The build completed successfully. Inspected the rendered -01 identifier/date, WAG composition section, per-hop requirements, and references. XML anchors are unique and cross-references resolve. The text renderer emits fixed-width trailing spaces; these are retained as generated. No Datatracker submission occurred.
- Delegation Token adds `client_id` naming the acting agent (RFC 9068 Section 2.2, AIMS Section 10.3) alongside `act`; the two MUST agree. Matches the SDK, which already mints `client_id` in receipts, and the sub/client_id split Asor's -02 adopts.
- 2026-10-06, second pass: new Section 5.3 Constraint Ceilings adopts the draft-asor-wimse-agent-delegation-chain-01 Section 4.2 constraint vocabulary (max, min, one_of, not_one_of, prefix, rank) and Section 4.3 subsumption as the `constraints` claim on the Delegation Token, fail-closed parsing, inherit-on-omit, and the rank-label ordering gap (DS must hold an ordering for every label it mints; verifier fails closed on an unknown label; raised with Asor for -02). Capability example no longer carries numeric ceilings; lifetime aggregates stay DS-debited. Informative reference ASOR added; Related Work gains the Asor paragraph. Chain Integrity moves to 5.4. Matches sdk PR #41 (all six types, DEFAULT_RANK_ORDERINGS, issuance-time refusal) and protocol PR #7 (18 of 20 asor vectors). Rebuilt with kdrfc -3.
- 2026-10-07: Section 5.4 states that actor attribution is attested per hop (receipt records the verified `act` and its as-of time; verifiers compose attestations rather than re-deriving a prior actor from a later token), per Wes Jackson's addition on the AIMS-00 multi-hop thread. Related Work notes the Delegate SD-JWT adoption call and the attenuation, lifetime, and depth rules it leaves to the chain layer. Rebuilt with kdrfc -3.

- 2026-10-07: back matter gains "Changes from -00" and three acknowledgments (Asor, Schrock, Jackson).
- 2026-10-07: rebuilt at 8a79cd4 and checked the rendered text: no line over 72 columns, ASCII only, no placeholders. Rebuild reproduces the committed `.txt` and `.xml` byte for byte.

- 2026-10-13: submission pass. `date:` set to 2026-10-13. References checked against Datatracker the same day: draft-ietf-oauth-identity-chaining -15 "approved for publication" becomes -17, in the RFC Editor queue; Delegate SD-JWT adoption call closed 2026-10-12, result not yet announced (oauth list and Gmail checked), and the Related Work paragraph says so; Zhu -04 to -05, Raut gets -02, Nelson -05 to -13 (retitled "Agent Delegation Receipts", description updated to principal-signed receipts), Reece -00 to -02 (full title), WPT -01 to -02, Ni -02 to -03, Goswami -00 to -01 (active, retitled, no longer expired), CB4A and ECT marked expired. ASOR -01, WAG -01, AIMS -00, AAT -01, WIMSE-ARCH -08, OBO-USER -02 and WIMSE-CRED-X -03 unchanged. New Section 9 Implementation Status per RFC 7942, written from the sdk source at main 09f9488: what is implemented (did:key Ed25519, version negotiation, brokered exercise, attenuated sub-delegation, all six constraint types, Ed25519 JWS receipts with client_id, parent hash and signed lineage, strict JSON, ancestor revocation check, audit) and what is not (RFC 8693 exchange, DPoP, RAR, RFC 7523 agent auth, CIBA, principal in `sub`, `act`/`prf`, revocation endpoint shape and timing). Asor v0.9.0 vectors re-run at 09f9488: 20 of 20; proposed scope vectors 4 of 4; results pinned in conformance/asor-delegation-chain/results. The section states the vectors use Asor's token format and do not test this document's formats. RFC 7942 and RFC 9421 added as informative. Changes from -00 updated.
- 2026-10-13 validation: rebuilt with `kdrfc -3` (kramdown-rfc 1.7.43, xml2rfc 3.34.1); before editing, the rebuild reproduced the committed -01 `.txt` byte for byte. Rendered text: no line over 72 columns, ASCII only (the XML keeps the single non-breaking space kramdown-rfc emits in the BCP 14 boilerplate, as before). idnits 2.17.1: 0 errors, 0 flaws; warnings are UCAN-SPEC cited only from Acknowledgments and one example FQDN; comments are the known non-RFC normative refs (DID-CORE, DID-KEY, OIDC-CIBA).

Submission steps: set `date:` in the `.mkd` front matter to the submission day, run `kdrfc -3`, commit the regenerated `.txt`/`.xml`, upload the `.xml` at https://datatracker.ietf.org/submit/ (Datatracker warns when the document date is more than a few days behind the upload). Then send the introduction post (Gmail draft r-7375876266720416502, to wimse cc oauth). Cutoff for IETF 127 is 2026-11-02.
