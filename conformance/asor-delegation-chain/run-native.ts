/**
 * Native ASOR -02/-03 fixture scoring. No claim mapping. Reject vectors
 * must match their outcome, hop and isolated rule, as in the SDK's
 * asor-02-vectors.test.ts. Does not test holder binding, status or HTTP.
 * Usage: npx tsx run-native.ts --sdk PATH --vectors DIR --count 35|36
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
function required(name: string): string {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1] || args[index + 1].startsWith('--')) {
    throw new Error(`Required: ${name}`);
  }
  return args[index + 1];
}
const sdk = resolve(required('--sdk'));
const vectors = resolve(required('--vectors'));
const count = Number(required('--count'));
if (count !== 35 && count !== 36) throw new Error('--count must be 35 or 36');
const sdkCommit = execFileSync('git', ['-C', sdk, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const sdkDirty = execFileSync('git', ['-C', sdk, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim();
if (sdkDirty) throw new Error('SDK tracked files must be clean for a pinned result');
const { verifyAgentDelegationChain } = await import(pathToFileURL(join(sdk, 'packages/attenuation/src/agent-delegation.ts')).href);
const { createHs256Key, staticKeyResolver } = await import(pathToFileURL(join(sdk, 'packages/attenuation/src/jws.ts')).href);

const CAUSE: Record<string, { hop: number; cause: RegExp }> = {
  'reject_child_adds_detail_type.json': { hop: 2, cause: /detail/ },
  'reject_alg_not_accepted.json': { hop: 0, cause: /signature/ },
  'reject_altered_sub_and_par_hash.json': { hop: 2, cause: /parent/ },
  'reject_aud_empty_array.json': { hop: 2, cause: /\baud\b/ },
  'reject_aud_null.json': { hop: 2, cause: /\baud\b/ },
  'reject_audience_mismatch.json': { hop: 2, cause: /\baud\b|audience/ },
  'reject_child_exp_exceeds_parent.json': { hop: 2, cause: /expires/ },
  'reject_child_raises_del_max_depth.json': { hop: 2, cause: /del_max_depth|max depth/i },
  'reject_cnf_without_confirmation.json': { hop: 2, cause: /\bcnf\b/ },
  'reject_constraint_extra_member.json': { hop: 2, cause: /max_rows/ },
  'reject_cross_type_lifetime_for_max.json': { hop: 2, cause: /max_rows/ },
  'reject_detail_extra_member.json': { hop: 2, cause: /detail|actions/ },
  'reject_duplicate_key_type.json': { hop: 2, cause: /max_rows/ },
  'reject_max_lifetime_widened.json': { hop: 2, cause: /max_calls/ },
  'reject_max_subtree_widened.json': { hop: 2, cause: /max_spend/ },
  'reject_missing_client_id.json': { hop: 2, cause: /client_id/ },
  'reject_missing_cnf.json': { hop: 1, cause: /\bcnf\b/ },
  'reject_mixed_case_wildcard.json': { hop: 1, cause: /User\.\*/ },
  'reject_newline_scope.json': { hop: 1, cause: /crm\.read/ },
  'reject_opaque_case_folded.json': { hop: 1, cause: /user\.read/ },
  'reject_opaque_over_wildcard.json': { hop: 1, cause: /drive\.\*/ },
  'reject_principal_altered.json': { hop: 1, cause: /\bsub\b/ },
  'reject_rank_order_mismatch.json': { hop: 2, cause: /egress/ },
  'reject_rank_outside_order.json': { hop: 2, cause: /egress/ },
  'reject_rank_without_order.json': { hop: 2, cause: /egress/ },
  'reject_reissued_parent.json': { hop: 2, cause: /parent/ },
  'reject_root_without_principal.json': { hop: 0, cause: /\bsub\b/ },
  'reject_second_detail.json': { hop: 2, cause: /detail/ },
  'reject_unknown_detail_type.json': { hop: 0, cause: /detail/ },
  'reject_unsafe_integer.json': { hop: 0, cause: /integer/ },
  'reject_wildcard_over_opaque.json': { hop: 1, cause: /drive\.Read/ },
};

const files = readdirSync(vectors).filter((file) => file.endsWith('.json')).sort();
if (files.length !== count) throw new Error(`Expected ${count} files, found ${files.length}`);
const rows = files.map((file) => {
  const bytes = readFileSync(join(vectors, file));
  const data = JSON.parse(bytes.toString('utf8'));
  const key = createHs256Key(Buffer.from(data.signer.secret_hex, 'hex'), data.signer.kid);
  const result = verifyAgentDelegationChain(data.tokens, {
    acceptedAlgs: data.verifier.accepted_algs,
    audience: data.verifier.audience,
    resolveKey: staticKeyResolver([key]),
    now: data.now,
  });
  const expected: string = data.expect ?? data.expect_reject_reason;
  const actual: string = result.ok ? 'accept' : result.reason;
  const cause = CAUSE[file];
  const pass = expected === 'accept' ? result.ok : (
    !result.ok && actual === expected && cause !== undefined
    && result.hop === cause.hop && cause.cause.test(result.message)
  );
  return {
    file, sha256: createHash('sha256').update(bytes).digest('hex'),
    expected, actual, pass,
    ...(!result.ok ? {
      hop: result.hop, message: result.message,
      expectedHop: cause?.hop, expectedCause: cause?.cause.source,
    } : {}),
  };
});
const passed = rows.filter((row) => row.pass).length;
console.log(JSON.stringify({
  measurement: 'native ASOR verifier: outcome, hop and cause',
  sdkCommit, node: process.version, vectorSet: basename(vectors),
  runnerSha256: createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
  runAt: new Date().toISOString(),
  limitations: 'Fixed library fixtures only; no holder binding, status, HTTP or live-provider coverage.',
  total: rows.length, passed, failed: rows.length - passed, rows,
}, null, 2));
if (passed !== count) process.exitCode = 1;
