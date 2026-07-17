#!/usr/bin/env bash
# Verify skill entry point for the Card Engine.
# Bootstrapped by the built-in `verify` skill. Also runnable directly:
#   ./.claude/verify/card-engine.sh
#
# Runs a layered check — fastest signals first — and exits nonzero on the first failure
# unless VERIFY_ALL=1 is set (then it runs everything and reports at the end).
#
# What it does NOT do:
#   - Start the dev server and drive the UI. That's the `verify` skill's job — this script
#     produces the objective checks (types, tests, build). UI verification happens in the
#     browser preview and is Claude's responsibility to eyeball.

set -u
cd "$(dirname "$0")/../.."

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

FAILURES=()
VERIFY_ALL="${VERIFY_ALL:-0}"

run_check() {
  local label="$1"
  shift
  echo "${BOLD}==> ${label}${RESET}"
  if "$@"; then
    echo "${GREEN}    ok${RESET}"
  else
    local code=$?
    echo "${RED}    FAIL (exit ${code})${RESET}"
    FAILURES+=("${label}")
    if [ "$VERIFY_ALL" != "1" ]; then
      report_and_exit
    fi
  fi
  echo
}

report_and_exit() {
  echo
  if [ ${#FAILURES[@]} -eq 0 ]; then
    echo "${GREEN}${BOLD}All checks passed.${RESET}"
    exit 0
  else
    echo "${RED}${BOLD}${#FAILURES[@]} check(s) failed:${RESET}"
    for f in "${FAILURES[@]}"; do
      echo "${RED}  - ${f}${RESET}"
    done
    exit 1
  fi
}

# Layer 1: is the workspace even installable?
run_check "install (npm ci-equivalent)" \
  bash -c 'cd card-engine && [ -d node_modules ] || npm install --no-audit --no-fund'

# Layer 2: typecheck (fast, catches most breakage)
run_check "typecheck (tsc -b --noEmit via build script)" \
  bash -c 'cd card-engine && npx tsc -b --noEmit'

# Layer 3: lint (oxlint is fast, catches obvious errors)
run_check "lint (oxlint)" \
  bash -c 'cd card-engine && npm run --silent lint'

# Layer 4: unit tests (economy has real tests; other modules will grow tests over time)
run_check "unit tests (vitest run)" \
  bash -c 'cd card-engine && npm run --silent test'

# Layer 5: production build (catches Vite/Rollup issues that dev mode hides)
run_check "production build (vite build)" \
  bash -c 'cd card-engine && npm run --silent build'

report_and_exit
