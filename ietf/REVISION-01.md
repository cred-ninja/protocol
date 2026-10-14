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

Submission steps (not yet done): set `date:` in the `.mkd` front matter to the submission day, run `kdrfc -3`, commit the regenerated `.txt`/`.xml`, upload the `.xml` at https://datatracker.ietf.org/submit/ (Datatracker warns when the document date is more than a few days behind the upload). Then send the introduction post (Gmail draft r-7375876266720416502, to wimse cc oauth). Cutoff for IETF 127 is 2026-11-02.
