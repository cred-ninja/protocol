#!/usr/bin/env bash
# Keep repository input as data and fail closed on collection/scanner errors.
set -euo pipefail
: "${PRIVATE_MARKERS:?PRIVATE_MARKERS must be supplied by the workflow}"

check_text() {
  local text=$1 pattern=$2 code
  if grep -qE -- "$pattern" <<< "$text"; then
    return 1
  else
    code=$?
    [[ "$code" -eq 1 ]] || return "$code"
  fi
}

case "${1:-files}" in
  files)
    inventory=$(mktemp "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/cred-protocol-files.XXXXXX")
    trap 'rm -f -- "$inventory"' EXIT
    git ls-files -z > "$inventory"
    fail=0
    while IFS= read -r -d '' path; do
      if [[ "$path" =~ (^|/)[Rr][Ee][Pp][Oo][Rr][Tt][Ss]/ ]]; then
        printf 'Blocked path: %q\n' "$path"
        fail=1
      fi
      case "$path" in
        .github/workflows/*|*.png|*.jpg|*.jpeg|*.gif|*.svg|*.ico|*.pdf) continue ;;
      esac
      if [[ ! -f "$path" ]]; then
        printf 'Unreadable tracked path: %q\n' "$path"
        fail=1
        continue
      fi
      if grep -qE -- "$PRIVATE_MARKERS" "./$path"; then
        printf 'Correspondence marker in path: %q\n' "$path"
        fail=1
      else
        code=$?
        if [[ "$code" -gt 1 ]]; then
          printf 'Scanner failed for path: %q\n' "$path"
          fail=1
        fi
      fi
    done < "$inventory"
    exit "$fail"
    ;;
  pr)
    : "${BASE_SHA:?BASE_SHA must be supplied}"
    : "${HEAD_SHA:?HEAD_SHA must be supplied}"
    # Retain compatibility with generated metadata on existing PRs.
    body=$(sed '/<!-- This is an auto-generated comment: release notes by coderabbit.ai -->/,/<!-- end of auto-generated comment: release notes by coderabbit.ai -->/d' <<< "${PR_BODY-}")
    markers="$PRIVATE_MARKERS|(^|[[:space:]/])reports/"
    # Collect separately: a failed git log must not be treated as no regex match.
    commits=$(git log --format='%H%n%B' "$BASE_SHA..$HEAD_SHA")
    if ! check_text "${PR_TITLE-}"$'\n'"$body" "$markers"; then
      echo '::error::PR text scan found a marker or failed.'
      exit 1
    fi
    if ! check_text "$commits" "$markers"; then
      echo '::error::Commit message scan found a marker or failed.'
      exit 1
    fi
    ;;
  *)
    echo 'Expected files or pr scan mode.' >&2
    exit 2
    ;;
esac
