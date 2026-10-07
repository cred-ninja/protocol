/**
 * Generates the scope-grammar vectors proposed on the wimse list for
 * draft-asor-wimse-agent-delegation-chain-02 (Kieran Sweeney, Iman Schrock,
 * 6 Oct 2026): three scope classes (literal, wildcard, opaque), with a
 * wildcard covering only a literal or a longer wildcard under its prefix.
 *
 * Same encoding as the v0.9.0 vectors: JCS-canonical header and payload,
 * HS256 under the published interop secret, par_hash = base64url(SHA-256 of
 * the parent's JWS Signing Input). Output goes to proposed-vectors/.
 *
 *   npx tsx make-scope-vectors.ts
 */
import { createHash, createHmac } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SECRET_HEX = '617474656e752d67756172642d696e7465726f702d766563746f72732d76312d66697865642d736563726574';
const SECRET = Buffer.from(SECRET_HEX, 'hex');
const HEADER = { alg: 'HS256', c14n: 'JCS', kid: 'interop-v1', typ: 'at+jwt' };
const OUT = join(process.cwd(), 'proposed-vectors');

function jcs(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(jcs).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${jcs((v as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}
const b64u = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function sign(payload: Record<string, unknown>): string {
  const input = `${b64u(Buffer.from(jcs(HEADER)))}.${b64u(Buffer.from(jcs(payload)))}`;
  return `${input}.${b64u(createHmac('sha256', SECRET).update(input).digest())}`;
}
const signingInputHash = (t: string) => b64u(createHash('sha256').update(t.split('.').slice(0, 2).join('.')).digest());

function chain(rootScopes: string[], childScopes: string[]) {
  const root = sign({
    aud: null, iss: 'attenu-guard', sub: 'orchestrator', jti: 'chain:n0', iat: 0, exp: 3600,
    del_depth: 0, del_max_depth: 2,
    authorization_details: [{ type: 'agent_delegation', scopes: rootScopes, constraints: [] }],
  });
  const child = sign({
    aud: null, iss: 'attenu-guard', sub: 'worker', jti: 'chain:n1', iat: 0, exp: 900,
    del_depth: 1, par_hash: signingInputHash(root),
    authorization_details: [{ type: 'agent_delegation', scopes: childScopes, constraints: [] }],
  });
  return [root, child];
}

const signer = { alg: 'HS256', kid: 'interop-v1', secret_hex: SECRET_HEX };
const vectors: Record<string, Record<string, unknown>> = {
  'reject_wildcard_over_opaque.json': {
    description: "Scope classes: the root grants the wildcard 'drive.*'; the child requests 'drive.Read'. The uppercase R fails literal-scope, so 'drive.Read' is an opaque scope and a wildcard never covers an opaque scope, even one that shares its prefix. MUST be rejected as not_narrower. A verifier that compares by raw prefix accepts this chain and is wrong.",
    expect_reject_reason: 'not_narrower', now: 0, signer,
    tokens: chain(['drive.*'], ['drive.Read']),
  },
  'reject_opaque_over_wildcard.json': {
    description: "Scope classes: the root grants the opaque scope 'drive.Read'; the child requests the wildcard 'drive.*'. An opaque scope covers only a byte-identical opaque scope and never a wildcard. MUST be rejected as not_narrower.",
    expect_reject_reason: 'not_narrower', now: 0, signer,
    tokens: chain(['drive.Read'], ['drive.*']),
  },
  'valid_wildcard_over_literal.json': {
    description: "Scope classes: the root grants 'payment.*'; the child requests 'payment.release', a literal-scope under the same prefix. Wildcard coverage of a literal is the -01 Section 4.1 rule, unchanged by the opaque class. MUST be accepted. Pairs with emilia's payment-terminal-wildcard-covered.",
    expect: 'accept', now: 0, signer,
    tokens: chain(['payment.*', 'mail.send'], ['payment.release']),
  },
  'valid_opaque_exact.json': {
    description: "Scope classes: the root grants two provider-native opaque scopes, 'User.Read' and 'repo:status'; the child requests 'repo:status' byte for byte. Opaque scopes narrow by exact equality. MUST be accepted; under -01 Section 4.1 as written both tokens are malformed, which is the interop gap the opaque class closes.",
    expect: 'accept', now: 0, signer,
    tokens: chain(['User.Read', 'repo:status'], ['repo:status']),
  },
};

mkdirSync(OUT, { recursive: true });
for (const [name, v] of Object.entries(vectors)) {
  writeFileSync(join(OUT, name), JSON.stringify(v, null, 2) + '\n');
  console.log('wrote', name);
}
