Prepared -01, 2026-10-06

- .mkd remains the filing source of truth; new readable .md and XML companions are included, preserving all -00 artifacts.
- Refresh AIMS reference and add WAG -01 as the provisioning composition target.
- Require per-hop re-verification, current delegation authority, monotonic narrowing, root subject continuity and accurate actor attribution, and reconstructable signed evidence.
- Use RFC 8693 act for attribution in receipts; nested actors do not grant authority.
- Preserve WAG Section 6.1 matched registration scope, including issuer and required partition context.

Validation: regenerated the XML and rendered text from the canonical `.mkd` with kramdown-rfc 1.7.43 and xml2rfc 3.34.1 using `kdrfc -3`. The build completed successfully. Inspected the rendered -01 identifier/date, WAG composition section, per-hop requirements, and references. XML anchors are unique and cross-references resolve. The text renderer emits fixed-width trailing spaces; these are retained as generated. No Datatracker submission occurred.
