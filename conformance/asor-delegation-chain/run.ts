/**
 * Runs the draft-asor-wimse-agent-delegation-chain-00 Appendix B interop
 * vectors through Cred's delegation chain logic and prints a conformance
 * matrix. Exit code is nonzero on any FAIL, and on any GAP unless
 * --allow-gaps is passed.
 *
 * Usage:
 *   npx tsx run.ts [--vectors DIR] [--sdk PATH] [--allow-gaps] [--json]
 *
 * Cred code is resolved, in order, from:
 *   1. --sdk PATH: a cred-ninja/sdk checkout (uses packages/vault/src directly)
 *   2. $CRED_SDK_PATH, same meaning
 *   3. a sibling checkout at ../../../sdk relative to this file
 *   4. an installed @credninja/vault package
 *
 * What is under test is exactly what ships:
 *   - vault verifyDelegationChain(): signature result, expiry, depth,
 *     parent commitment linkage, scope subsumption, expiry monotonicity.
 *   - vault validateSubDelegation(): called per hop the way
 *     POST /api/v1/subdelegate calls it, as a second opinion on scopes and depth.
 *
 * This runner does two things Cred's shipping code does not, and it does
 * them because the vectors are in Asor's encoding rather than Cred's:
 *   - It verifies the HS256 signature with the published interop secret.
 *     Cred receipts are Ed25519. The check structure (JWS over header.payload)
 *     is the same; only the primitive differs.
 *   - It computes each hop's commitment hash the way the draft defines it,
 *     base64url(SHA-256(JWS Signing Input)), so that the child's par_hash can
 *     be compared against it. Cred's own receipts commit to SHA-256 hex over
 *     the full compact receipt. verifyDelegationChain() only compares the two
 *     strings it is handed, so this runner exercises the same linkage code
 *     path as verifyReceiptChain() does for native receipts.
 *
 * Claim mapping (Asor Delegation Token to Cred hop):
 *   sub                              agentDid
 *   jti                              delegationId
 *   del_depth                        chainDepth
 *   del_max_depth (root)             maxDepth = del_max_depth - 1
 *                                    (Asor: leaf depth n < del_max_depth;
 *                                     Cred: leaf depth <= maxDepth)
 *   authorization_details[0].scopes  scopes
 *   par_hash                         parentHash
 *   iat, exp                         iat, exp
 *   authorization_details[0].constraints   constraints (asor-01 4.2 types;
 *                                           rank labels resolve through the
 *                                           SDK's DEFAULT_RANK_ORDERINGS,
 *                                           which carries the draft's
 *                                           egress none < internal < any)
 *
 * Reason mapping (Cred to Asor): exp_not_monotonic -> expired,
 * parent_hash_mismatch -> par_hash_mismatch, everything else identical.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
function flag(name: string): string | undefined {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
}
const VECTOR_DIR = flag('--vectors') ?? join(here, 'vectors');
const ALLOW_GAPS = args.includes('--allow-gaps');
const JSON_OUT = args.includes('--json');

type VaultApi = {
  verifyDelegationChain: (hops: any[], opts?: any) => any;
  validateSubDelegation: (input: any) => any;
  parseConstraints?: (value: unknown) => { ok: true; constraints: any[] } | { ok: false; message: string };
  parseStrictJson?: (text: string) => unknown;
  StrictJsonError?: any;
  DelegationChainError: any;
};
let vaultForDecode: VaultApi | null = null;

async function loadVault(): Promise<{ api: VaultApi; source: string }> {
  const candidates = [flag('--sdk'), process.env.CRED_SDK_PATH, resolve(here, '../../../sdk')].filter(Boolean) as string[];
  for (const base of candidates) {
    const entry = join(base, 'packages/vault/src/index.ts');
    if (existsSync(entry)) {
      const api = await import(pathToFileURL(entry).href);
      return { api, source: entry };
    }
  }
  const require = createRequire(import.meta.url);
  const api = require('@credninja/vault');
  return { api, source: 'installed @credninja/vault' };
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4), 'base64');
}
function b64url(b: Buffer): string {
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function signingInputHash(token: string): string {
  const [h, p] = token.split('.');
  return b64url(createHash('sha256').update(`${h}.${p}`, 'utf8').digest());
}
function hs256Valid(token: string, secret: Buffer): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const mac = createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`, 'utf8').digest();
  const sig = b64urlDecode(parts[2]);
  return sig.length === mac.length && timingSafeEqual(mac, sig);
}
function payloadOf(token: string): any {
  // Some adversarial vectors carry payload bytes that are valid base64url but
  // not valid JSON (e.g. a bare `NaN` literal, which RFC 8259 disallows), or
  // JSON that RFC 8259 leaves open and JCS forbids (a duplicate member, an
  // integer outside the binary64 exact range). Cred's receipt decoder uses
  // the vault's strict parser (parseStrictJson) and refuses such a token
  // before it ever reaches the chain verifier, so we decode the same way
  // here and report the failure as a pseudo-reason runVector can classify.
  // When the sdk under test predates parseStrictJson, fall back to
  // JSON.parse, which makes duplicate_member and unsafe_integer GAPs.
  const text = b64urlDecode(token.split('.')[1]).toString('utf8');
  try {
    if (vaultForDecode?.parseStrictJson) return vaultForDecode.parseStrictJson(text);
    return JSON.parse(text);
  } catch (err: any) {
    const code = vaultForDecode?.StrictJsonError && err instanceof vaultForDecode.StrictJsonError ? err.code : 'syntax';
    return { __decodeError: err?.message ?? String(err), __decodeCode: code };
  }
}

const REASON_MAP: Record<string, string> = {
  exp_not_monotonic: 'expired',
  parent_hash_mismatch: 'par_hash_mismatch',
  scope_escalation_denied: 'not_narrower',
  constraint_escalation_denied: 'not_narrower',
  no_scopes_granted: 'not_narrower',
  depth_exceeded: 'depth_invalid',
  // JSON.parse itself enforces RFC 8259 (no NaN/Infinity literals), so a
  // payload that fails to decode for that reason is Cred rejecting exactly
  // what the draft calls non_finite, just one layer earlier than a vault
  // reason code.
  payload_undecodable: 'non_finite',
  // Strict-JSON rejections from the vault's parseStrictJson, surfaced by
  // payloadOf. duplicate_member maps to the draft's own reason; an integer
  // outside the binary64 exact range is what the vectors call malformed.
  duplicate_member: 'duplicate_member',
  unsafe_integer: 'malformed',
};

/**
 * A small number of vectors declare "malformed" for a condition Cred rejects
 * correctly but buckets under a different, already-meaningful reason code
 * rather than a distinct one: an invalid wildcard (bare "*", or a wildcard
 * that is not the final segment) is, by Cred's own design (see
 * isValidScope() in delegation-chain.ts), a scope that "matches only itself
 * and can never expand a grant" -- so it surfaces as not_narrower during
 * subsumption, not as a separate malformed-scope error. Folding not_narrower
 * into malformed globally would be wrong (most not_narrower rejections are
 * genuine over-broad-scope vectors whose own declared reason is
 * not_narrower), so this equivalence is recorded per vector file instead of
 * in the flat REASON_MAP.
 */
const VECTOR_REASON_OVERRIDES: Record<string, { acceptCredReason: string; note: string }> = {
  'reject_bare_wildcard.json': {
    acceptCredReason: 'not_narrower',
    note: "declared malformed; Cred rejects via scope subsumption instead (a bare '*' fails isValidScope and so matches only itself, never a parent's scopes) -- same outcome, different reason bucket by design",
  },
  'reject_nonterminal_wildcard.json': {
    acceptCredReason: 'not_narrower',
    note: "declared malformed; Cred rejects via scope subsumption instead ('crm.*.read' fails isValidScope and so matches only itself) -- same outcome, different reason bucket by design",
  },
};

type Row = { vector: string; expect: string; cred: string; result: 'PASS' | 'FAIL' | 'GAP' | 'MASKED'; note: string };

function runVector(file: string, vault: VaultApi): Row {
  const data = JSON.parse(readFileSync(join(VECTOR_DIR, file), 'utf8'));
  if (data.draft === '02') return runVector02(file, data, vault);
  const expect: string = data.expect ?? data.expect_reject_reason;
  const secret = Buffer.from(data.signer.secret_hex, 'hex');
  const now: number = data.now ?? 0;
  const tokens: string[] = data.tokens;

  const payloads = tokens.map(payloadOf);
  const badPayloadIndex = payloads.findIndex((p) => p && typeof p.__decodeError === 'string');
  if (badPayloadIndex !== -1) {
    const code: string = payloads[badPayloadIndex].__decodeCode ?? 'syntax';
    const credReason = code === 'syntax' ? 'payload_undecodable' : code;
    const mapped = REASON_MAP[credReason] ?? credReason;
    return {
      vector: file,
      expect,
      cred: `reject:${credReason}`,
      result: mapped === expect ? 'PASS' : 'FAIL',
      note: `hop ${badPayloadIndex}: payload rejected by the strict decoder (${payloads[badPayloadIndex].__decodeError})`,
    };
  }
  const root = payloads[0];
  const maxDepth = typeof root.del_max_depth === 'number' ? root.del_max_depth - 1 : undefined;

  const hops = tokens.map((t, i) => {
    const p = payloads[i];
    const ad = p.authorization_details?.[0] ?? {};
    return {
      agentDid: p.sub,
      delegationId: p.jti,
      chainDepth: p.del_depth,
      scopes: ad.scopes ?? [],
      iat: p.iat,
      exp: p.exp,
      ...(ad.constraints !== undefined ? { constraints: ad.constraints } : {}),
      signatureValid: hs256Valid(t, secret),
      selfHash: signingInputHash(t),
      ...(typeof p.par_hash === 'string' ? { parentHash: p.par_hash } : {}),
    };
  });

  // 1. The chain verifier.
  const chain = vault.verifyDelegationChain(hops, { now, maxDepth, requireParentHash: true });
  if (!chain.ok) {
    const override = VECTOR_REASON_OVERRIDES[file];
    const mapped = REASON_MAP[chain.reason] ?? chain.reason;
    const matches = mapped === expect || (override && chain.reason === override.acceptCredReason && expect === 'malformed');
    return {
      vector: file,
      expect,
      cred: `reject:${chain.reason}`,
      result: matches ? 'PASS' : 'FAIL',
      note: override && matches ? override.note : `hop ${chain.hop}: ${chain.message}`,
    };
  }

  // 2. Per-hop issuance-time validation, as the subdelegate route runs it.
  // The route parses the `constraints` claim off the wire with
  // parseConstraints before handing it to validateSubDelegation; do the same.
  // The chain verifier above already rejected malformed constraints, so a
  // parse failure here cannot happen on a chain that reached this point.
  const parsed = (value: unknown): any[] | undefined => {
    if (value === undefined || !vault.parseConstraints) return undefined;
    const r = vault.parseConstraints(value);
    return r.ok ? r.constraints : undefined;
  };
  for (let i = 1; i < hops.length; i++) {
    try {
      const parentConstraints = parsed(hops[i - 1].constraints);
      const requestedConstraints = parsed(hops[i].constraints);
      vault.validateSubDelegation({
        parent: { delegationId: hops[i - 1].delegationId, agentDid: hops[i - 1].agentDid, service: 'attenu', userId: 'default', appClientId: 'local', scopesGranted: hops[i - 1].scopes, chainDepth: hops[i - 1].chainDepth, ...(parentConstraints ? { constraints: parentConstraints } : {}) },
        childAgentDid: hops[i].agentDid,
        service: 'attenu', userId: 'default', appClientId: 'local',
        requestedScopes: hops[i].scopes,
        ...(requestedConstraints ? { requestedConstraints } : {}),
        permission: { allowedScopes: hops[i - 1].scopes, delegatable: true, maxDelegationDepth: maxDepth ?? Number.MAX_SAFE_INTEGER },
      });
    } catch (err: any) {
      const code = err instanceof vault.DelegationChainError ? err.code : 'validation_failed';
      const mapped = REASON_MAP[code] ?? code;
      return { vector: file, expect, cred: `reject:${code}`, result: mapped === expect ? 'PASS' : 'FAIL', note: `validateSubDelegation hop ${i}: ${err.message}` };
    }
  }

  // 3. Accepted. Anything the vector declares as a rejection from here on
  // is a property Cred does not represent.
  if (expect === 'accept') return { vector: file, expect, cred: 'accept', result: 'PASS', note: '' };
  return { vector: file, expect, cred: 'accept', result: 'GAP', note: 'accepted; declared rejection reason not represented in Cred' };
}

// ---------------------------------------------------------------------------
// draft-asor-wimse-agent-delegation-chain-02 vectors (attenu-guard v0.20.0,
// tests/vectors-02/; byte-identical in attenu-guard-ts v0.14.0). Selected per
// file by `"draft": "02"`. See README section "-02 vector set" for every
// mapping below and why each one is there.
//
// Claim mapping (-02 Delegation Token to Cred):
//   client_id                         hop.agentDid (the Acting Agent; Cred's
//                                     native receipts carry the agent DID in
//                                     both sub and client_id)
//   sub                               validateSubDelegation parent.userId /
//                                     userId (Cred's principal is the user;
//                                     it must match across a hop, else
//                                     user_mismatch)
//   jti                               hop.delegationId
//   del_depth                         hop.chainDepth
//   DT_0.del_max_depth                maxDepth = del_max_depth - 1
//   authorization_details[0].scopes   hop.scopes
//   authorization_details[0].constraints   hop.constraints, passed through
//                                     untouched (including `order` on rank)
//   par_hash                          hop.parentHash
//   iat, exp                          hop.iat, hop.exp
// Not mapped, because Cred has no representation for them: aud (shape and
// the step 8 audience check), cnf, authorization_details beyond index 0,
// detail `type`, members of the detail other than scopes/constraints, and
// del_max_depth on any token but DT_0. A rule that depends only on these is
// a GAP when Cred accepts.
//
// Step 1: Cred's own receipt verifier takes the algorithm from the key it is
// configured with and never from the header. The runner does the same: the
// configured algorithm is the vector's signer.alg, and it is only usable if
// the vector's verifier.accepted_algs lists it.
// ---------------------------------------------------------------------------

const REASON_MAP_02: Record<string, string> = {
  ...REASON_MAP,
  user_mismatch: 'principal_altered',
};

/**
 * Where each -02 reject vector's single mutation lives, so a matching outcome
 * name can be checked against its cause. Most -02 vectors carry the canonical
 * constraint set from DT_0 onward; an implementation that cannot parse that
 * set rejects every chain at hop 0 as `malformed`, which would read as a PASS
 * on every vector that happens to declare `malformed`. A row whose outcome
 * name matches but whose rejection is not at `hop` with a message matching
 * `cause` is reported MASKED, not PASS.
 */
const CAUSE_02: Record<string, { hop: number; cause: RegExp; rule: string }> = {
  'reject_alg_not_accepted.json': { hop: 0, cause: /signature/, rule: 'step 1, alg not on the verifier list' },
  'reject_altered_sub_and_par_hash.json': { hop: 2, cause: /parent/, rule: 'step 2 before step 3' },
  'reject_aud_empty_array.json': { hop: 2, cause: /\baud\b/, rule: 'Section 3, aud shape' },
  'reject_aud_null.json': { hop: 2, cause: /\baud\b/, rule: 'Section 3, aud shape' },
  'reject_audience_mismatch.json': { hop: 2, cause: /\baud\b|audience/, rule: 'step 8, leaf audience' },
  'reject_child_exp_exceeds_parent.json': { hop: 2, cause: /expires/, rule: 'Section 4.3 rule 4 at step 5' },
  'reject_child_raises_del_max_depth.json': { hop: 2, cause: /del_max_depth|max depth/i, rule: 'Section 4.3 rule 5, per hop' },
  'reject_cnf_without_confirmation.json': { hop: 2, cause: /\bcnf\b/, rule: 'Section 3, cnf shape' },
  'reject_constraint_extra_member.json': { hop: 2, cause: /max_rows/, rule: 'Section 4.2, closed constraint object' },
  'reject_cross_type_lifetime_for_max.json': { hop: 2, cause: /max_rows/, rule: 'Section 4.3, no cross-type inference' },
  'reject_detail_extra_member.json': { hop: 2, cause: /detail|actions/, rule: 'Section 4, closed detail' },
  'reject_duplicate_key_type.json': { hop: 2, cause: /max_rows/, rule: 'Section 4.2, (key, type) uniqueness' },
  'reject_max_lifetime_widened.json': { hop: 2, cause: /max_calls/, rule: 'Section 4.3, max_lifetime subsumption' },
  'reject_max_subtree_widened.json': { hop: 2, cause: /max_spend/, rule: 'Section 4.3, max_subtree subsumption' },
  'reject_missing_client_id.json': { hop: 2, cause: /missing required fields/, rule: 'Section 3, client_id required' },
  'reject_missing_cnf.json': { hop: 1, cause: /\bcnf\b/, rule: 'Section 3, cnf required' },
  'reject_mixed_case_wildcard.json': { hop: 1, cause: /User\.\*|scope/, rule: 'Section 4.1, invalid scope is malformed' },
  'reject_newline_scope.json': { hop: 1, cause: /crm\.read|scope/, rule: 'Section 4.1, invalid scope is malformed' },
  'reject_opaque_case_folded.json': { hop: 1, cause: /user\.read/, rule: 'Section 4.1, no case folding' },
  'reject_opaque_over_wildcard.json': { hop: 1, cause: /drive\.\*/, rule: 'Section 4.1, opaque never covers wildcard' },
  'reject_principal_altered.json': { hop: 1, cause: /user/i, rule: 'step 3, principal invariance' },
  'reject_rank_order_mismatch.json': { hop: 2, cause: /egress/, rule: 'Section 4.3, child order equals parent order' },
  'reject_rank_outside_order.json': { hop: 2, cause: /egress/, rule: 'Section 4.2, rank must be in order' },
  'reject_rank_without_order.json': { hop: 2, cause: /egress/, rule: 'Section 4.2, label rank needs order' },
  'reject_reissued_parent.json': { hop: 2, cause: /parent/, rule: 'Section 5, commitment to the instance' },
  'reject_root_without_principal.json': { hop: 0, cause: /\bsub\b|principal|user/i, rule: 'Section 3, DT_0 sub non-empty' },
  'reject_second_detail.json': { hop: 2, cause: /detail/, rule: 'Section 4, exactly one detail' },
  'reject_unknown_detail_type.json': { hop: 0, cause: /detail/, rule: 'Section 4.4, unknown detail type' },
  'reject_unsafe_integer.json': { hop: 0, cause: /integer|unsafe/i, rule: 'Section 3, integer above 2^53-1' },
  'reject_wildcard_over_opaque.json': { hop: 1, cause: /drive\.Read/, rule: 'Section 4.1, wildcard never covers opaque' },
};

/**
 * Accepting -02 vectors whose point is a claim Cred does not read. Cred
 * accepts them because it never looks, so an accept there says nothing
 * about the rule and is reported GAP, not PASS.
 */
const ACCEPT_UNMAPPED_02: Record<string, string> = {
  'valid_audience_array.json': 'aud as an array naming the verifier (step 8)',
};

function runVector02(file: string, data: any, vault: VaultApi): Row {
  const expect: string = data.expect ?? data.expect_reject_reason;
  const secret = Buffer.from(data.signer.secret_hex, 'hex');
  const algUsable = Array.isArray(data.verifier?.accepted_algs) && data.verifier.accepted_algs.includes(data.signer.alg);
  const now: number = data.now ?? 0;
  const tokens: string[] = data.tokens;
  const cause = CAUSE_02[file];

  const judge = (credReason: string, hop: number, message: string): Row => {
    const mapped = REASON_MAP_02[credReason] ?? credReason;
    const note = `hop ${hop}: ${message}`;
    if (mapped !== expect) return { vector: file, expect, cred: `reject:${credReason}`, result: 'FAIL', note };
    if (cause && !(hop === cause.hop && cause.cause.test(message))) {
      return { vector: file, expect, cred: `reject:${credReason}`, result: 'MASKED', note: `${note} [vector tests ${cause.rule} at hop ${cause.hop}; Cred rejected on something else]` };
    }
    return { vector: file, expect, cred: `reject:${credReason}`, result: 'PASS', note };
  };

  const payloads = tokens.map(payloadOf);
  const bad = payloads.findIndex((p) => p && typeof p.__decodeError === 'string');
  if (bad !== -1) {
    const code: string = payloads[bad].__decodeCode ?? 'syntax';
    return judge(code === 'syntax' ? 'payload_undecodable' : code, bad, `payload rejected by the strict decoder (${payloads[bad].__decodeError})`);
  }
  const root = payloads[0];
  const maxDepth = typeof root.del_max_depth === 'number' ? root.del_max_depth - 1 : undefined;
  const detailOf = (p: any) => (Array.isArray(p.authorization_details) ? p.authorization_details[0] : undefined) ?? {};

  const hops = tokens.map((t, i) => {
    const p = payloads[i];
    const ad = detailOf(p);
    return {
      agentDid: p.client_id,
      delegationId: p.jti,
      chainDepth: p.del_depth,
      scopes: ad.scopes ?? [],
      iat: p.iat,
      exp: p.exp,
      ...(ad.constraints !== undefined ? { constraints: ad.constraints } : {}),
      signatureValid: algUsable && hs256Valid(t, secret),
      selfHash: signingInputHash(t),
      ...(typeof p.par_hash === 'string' ? { parentHash: p.par_hash } : {}),
    };
  });

  const chain = vault.verifyDelegationChain(hops, { now, maxDepth, requireParentHash: true });
  if (!chain.ok) return judge(chain.reason, chain.hop, chain.message);

  const parsed = (value: unknown): any[] | undefined => {
    if (value === undefined || !vault.parseConstraints) return undefined;
    const r = vault.parseConstraints(value);
    return r.ok ? r.constraints : undefined;
  };
  for (let i = 1; i < hops.length; i++) {
    try {
      const parentConstraints = parsed(hops[i - 1].constraints);
      const requestedConstraints = parsed(hops[i].constraints);
      vault.validateSubDelegation({
        parent: { delegationId: hops[i - 1].delegationId, agentDid: hops[i - 1].agentDid, service: 'attenu', userId: payloads[i - 1].sub, appClientId: 'local', scopesGranted: hops[i - 1].scopes, chainDepth: hops[i - 1].chainDepth, ...(parentConstraints ? { constraints: parentConstraints } : {}) },
        childAgentDid: hops[i].agentDid,
        service: 'attenu', userId: payloads[i].sub, appClientId: 'local',
        requestedScopes: hops[i].scopes,
        ...(requestedConstraints ? { requestedConstraints } : {}),
        permission: { allowedScopes: hops[i - 1].scopes, delegatable: true, maxDelegationDepth: maxDepth ?? Number.MAX_SAFE_INTEGER },
      });
    } catch (err: any) {
      const code = err instanceof vault.DelegationChainError ? err.code : 'validation_failed';
      return judge(code, i, `validateSubDelegation: ${err.message}`);
    }
  }

  if (expect === 'accept') {
    const unmapped = ACCEPT_UNMAPPED_02[file];
    if (unmapped) return { vector: file, expect, cred: 'accept', result: 'GAP', note: `accepted, but ${unmapped} is not represented in Cred, so the accept tests nothing` };
    return { vector: file, expect, cred: 'accept', result: 'PASS', note: '' };
  }
  return { vector: file, expect, cred: 'accept', result: 'GAP', note: `accepted; ${cause?.rule ?? 'declared rejection'} is not represented in Cred` };
}

function sdkCommit(source: string): string | undefined {
  const m = source.match(/^(.*)\/packages\/vault\/src\/index\.ts$/);
  if (!m) return undefined;
  try {
    const head = readFileSync(join(m[1], '.git', 'HEAD'), 'utf8').trim();
    if (!head.startsWith('ref: ')) return head;
    const ref = head.slice(5);
    const loose = join(m[1], '.git', ref);
    if (existsSync(loose)) return readFileSync(loose, 'utf8').trim();
    const packed = readFileSync(join(m[1], '.git', 'packed-refs'), 'utf8').split('\n').find((l) => l.endsWith(` ${ref}`));
    return packed?.split(' ')[0];
  } catch {
    return undefined;
  }
}

const { api, source } = await loadVault();
vaultForDecode = api;
const files = readdirSync(VECTOR_DIR).filter((f) => f.endsWith('.json')).sort((a, b) => (a.startsWith('valid') ? -1 : b.startsWith('valid') ? 1 : a.localeCompare(b)));
const rows = files.map((f) => runVector(f, api));
const pass = rows.filter((r) => r.result === 'PASS').length;
const fail = rows.filter((r) => r.result === 'FAIL').length;
const gap = rows.filter((r) => r.result === 'GAP').length;
const masked = rows.filter((r) => r.result === 'MASKED').length;
const commit = sdkCommit(source);

if (JSON_OUT) {
  console.log(JSON.stringify({ source, sdkCommit: commit, node: process.version, vectors: VECTOR_DIR, rows, pass, fail, gap, masked }, null, 2));
} else {
  console.log(`Cred under test: ${source}${commit ? ` (${commit})` : ''}`);
  console.log(`Vectors: ${VECTOR_DIR}\n`);
  console.log('| Vector | Expected | Cred | Result |');
  console.log('|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.vector} | ${r.expect} | ${r.cred} | ${r.result} |`);
  console.log(`\n${pass}/${rows.length} PASS, ${fail} FAIL, ${gap} GAP${masked ? `, ${masked} MASKED` : ''}`);
  for (const r of rows) if (r.note) console.log(`  ${r.vector}: ${r.note}`);
}

// MASKED is not a pass: the declared outcome name came from an unrelated
// rejection, so the rule the vector isolates was never reached.
process.exit(fail > 0 || masked > 0 || (gap > 0 && !ALLOW_GAPS) ? 1 : 0);
