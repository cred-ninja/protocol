# Conformance Requirements

A conformant implementation of the Credential Delegation Protocol MUST satisfy the following requirements. Requirements use [RFC 2119] key words.

## Delegation Server (DS)

### Agent Authentication
- MUST accept JWT Bearer assertions [RFC 7523] signed with Ed25519 or P-256 keys
- MUST NOT reject a did:key it has not seen before (no pre-registration required)
- MUST validate `jti` uniqueness to prevent replay attacks
- MUST reject assertions with `exp` more than 300 seconds after `iat`

### Delegation Token Issuance
- MUST issue Delegation Tokens as DPoP-bound JWTs [RFC 9449]
- MUST include all required claims (Section 5.1 of the spec)
- MUST NOT include raw OAuth tokens or credentials in any agent-facing response
- MUST validate that sub-delegation capabilities are a strict subset of the parent DT
- MUST produce a signed delegation receipt for each delegation hop
- MUST enforce a maximum chain depth of 5 (RECOMMENDED)
- SHOULD default DT lifetime to 15 minutes; MUST NOT exceed 1 hour

### Credential Vault
- MUST store OAuth credentials encrypted at rest (AES-256-GCM or equivalent)
- MUST reference credentials by opaque handles only
- MUST NOT expose raw credentials to agents at any point

### Revocation
- MUST invalidate a revoked DT within **1 second**
- MUST cascade revocation to all descendant DTs within **5 seconds**
- MUST return HTTP 401 with `error: delegation_revoked` for in-flight exercise requests using revoked DTs
- MUST write an immutable revocation event to the audit log

### Consent
- MUST store an immutable consent record for each delegation grant
- MUST retain consent records for at least 90 days
- MUST re-request consent when capabilities are broadened, grant has expired, or `agent_operator` changes

### Audit Log
- MUST log all delegation events with `consent_id`, agent DID, capabilities, and timestamp
- MUST NOT log raw credentials or refresh tokens
- Log entries MUST be tamper-evident (e.g., HMAC chain or append-only storage)

## Agent (Client)

### Identity
- MUST generate an ephemeral Ed25519 or P-256 key pair at instantiation
- SHOULD generate a new key pair per session
- MUST derive its DID using the did:key method

### Token Handling
- MUST NOT attempt to decode, cache, or persist raw credentials
- MUST include a valid DPoP proof on every `/exercise` request
- MUST NOT forward Delegation Tokens to third parties

### Sub-delegation
- MUST NOT request sub-delegation capabilities broader than those in its own DT
- MUST declare `no_delegate` intent when not intending to sub-delegate (RECOMMENDED)

## Resource Server (RS) — Optional Native Support

A resource server that natively supports Cred Protocol:

- MAY accept Delegation Tokens directly in lieu of OAuth Bearer tokens
- MUST validate the `act` claim against the presenting agent's DID
- MUST validate the `authorization_details` against the requested operation
- MUST reject DTs with `exp` in the past
- MUST reject DTs without a valid DPoP proof

---

*Conformance tests are planned for a future version of this specification.*
