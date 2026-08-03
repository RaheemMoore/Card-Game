#!/usr/bin/env bash
# Objective Card Engine checks. Runtime/visual evidence is handled by the
# visual-playtest skill; this script never claims visual acceptance.
set -u
cd "$(dirname "$0")/../.."

RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
FAILURES=(); VERIFY_ALL="${VERIFY_ALL:-0}"
run_check() {
  local label="$1"; shift
  echo "${BOLD}==> ${label}${RESET}"
  if "$@"; then echo "${GREEN}    ok${RESET}"; else
    local code=$?; echo "${RED}    FAIL (exit ${code})${RESET}"; FAILURES+=("${label}")
    [ "$VERIFY_ALL" = "1" ] || report_and_exit
  fi
  echo
}
report_and_exit() {
  echo
  if [ ${#FAILURES[@]} -eq 0 ]; then echo "${GREEN}${BOLD}All objective checks passed.${RESET}"; exit 0; fi
  echo "${RED}${BOLD}${#FAILURES[@]} check(s) failed:${RESET}"
  for f in "${FAILURES[@]}"; do echo "${RED}  - ${f}${RESET}"; done
  exit 1
}

run_check "studio configuration" node .claude/scripts/studio-lint.mjs
run_check "studio routing fixtures" node .claude/scripts/studio-routing-test.mjs
run_check "studio failure regressions" node .claude/scripts/studio-regression-test.mjs
run_check "dependency preflight (no automatic install)" bash -c 'test -d card-engine/node_modules || { echo "card-engine/node_modules is absent. Run npm ci intentionally, then rerun verification." >&2; exit 2; }'
run_check "typecheck" bash -c 'cd card-engine && npx tsc -b --noEmit && npx tsc -p tsconfig.api.json --noEmit'
run_check "lint" bash -c 'cd card-engine && npm run --silent lint'
run_check "unit tests" bash -c 'cd card-engine && npm run --silent test'
run_check "production build" bash -c 'cd card-engine && npm run --silent build'
report_and_exit
