# CI and native review

## Deterministic checks

- `conformance / draft-asor vectors` keeps its `vectors` job, existing path/event
  filters, SDK selection, existing `--allow-gaps` policy and retained results. It
  checks out the public SDK separately and runs the actual vector runner. Its
  runner dependencies are installed from the committed lockfile with `npm ci`.
- `Block Private Correspondence` keeps its existing job identity and marker
  policy. It now uses NUL-delimited Git paths, avoids logging matching content,
  and rejects collection/scanner failures. Tests exercise real Git filenames,
  marker refusals, missing files and failed Git/grep commands.
- `Workflow Security` runs on every main-target PR and main push. It validates all
  workflows with actionlint 1.7.12 plus ShellCheck and offline plain-output
  zizmor 1.32.0, then executes the scanner regression tests.

External Actions are commit-pinned; checkout credentials are not persisted.
No deployment, release publication, model credential or write-token job is added.
Existing conformance gaps are not waived or relabeled as passes by this change.
A passing analyzer does not prove protocol conformance; inspect the vector run.

## Native Codex review

Use the GitHub integration authorized through the repository owner's ChatGPT
account, not an API-key Actions workflow. In Codex settings, enable this repository
and automatic review for opening/ready-for-review events where offered. Confirm
actual completion and the exact reviewed commit in the bot summary; a reaction
alone is acknowledgment. Use `@codex review` for one manual request when needed,
not repeated requests for unchanged diffs.

The owner-approved repository review rules are in root `AGENTS.md`, introduced
by PR #28. Automatic triggering must be verified on a current eligible PR after
the owner's settings correction; the earlier manual review is not automatic
evidence. Keep CodeRabbit operational until that acceptance succeeds. No required
checks, approval policies or GitHub Apps are changed by this operating guide;
CI execution is distinct from merge-policy enforcement.

Local fallback, after checking `codex login status` reports ChatGPT authentication:

```sh
git fetch origin refs/heads/main:refs/remotes/origin/main &&
  env -u OPENAI_API_KEY -u CODEX_API_KEY codex -s read-only -a never \
    exec --ignore-user-config --ephemeral -c forced_login_method='"chatgpt"' \
    -c 'shell_environment_policy.inherit="none"' review --base origin/main
```

Inspect untracked files before local review. Never expose credentials or private
correspondence. For inspected uncommitted work, replace `review --base origin/main`
with `review --uncommitted`; the SDK's public
[review runbook](https://github.com/cred-ninja/sdk/blob/main/docs/codex-reviews.md)
covers guarded PR checkouts and deeper security review. Never export subscription
sessions to CI, buy credits automatically or
switch silently to API billing. Native GitHub reviews and local reviews consume
their respective subscription allowances; wait for reset or use a human reviewer
when constrained. Codex remains advisory, independent of deterministic CI.

## Local verification

```sh
node --test scripts/ci/*.test.mjs
shellcheck scripts/ci/public-leak-guard.sh
actionlint -color
zizmor --offline --format plain .github/workflows
```

Use the exact analyzer versions above and provide ShellCheck for parity. The full
vector run additionally requires the real public SDK checkout/build, as specified
by its existing workflow. Do not substitute a source-only scan for that execution.

Generic JWT secret detection needs a separately reviewed conformance-fixture
policy: the baseline scanner reports JWT-shaped published vector data. This
workflow makes no claim that such a policy or a full credential scan is installed;
it does not add a broad vector-directory exclusion or suppress runtime credentials.
