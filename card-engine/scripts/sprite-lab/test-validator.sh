#!/usr/bin/env bash
#
# Regression test for the sprite validator.
#
# WHY THIS EXISTS: the validator once "passed" a sheet whose costume change was
# plainly visible in game. It compared palette drift against frame 1, and when
# the rogue frame moved into the idle slot the reported drift fell from 51.7 to
# 16.8 and the check went quiet. That hole was found by luck. A quality gate
# with no test of its own rots silently and gives false confidence — which is
# worse than having no gate, because you stop looking.
#
# fixtures/known-bad-cardwright.* is the real sheet that shipped and was
# rejected on five defects. The validator MUST keep failing it.
#
# Usage: ./test-validator.sh
set -uo pipefail
cd "$(dirname "$0")"

# Windows Git Bash commonly exposes the interpreter as `python` rather than
# `python3`. Force UTF-8 as well: otherwise printing the validator's ✓/✗
# evidence can crash under the legacy cp1252 console before assertions run.
export PYTHONUTF8=1
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN=python3
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN=python
else
  echo "FAIL — Python is required to run the sprite validator regression."
  exit 1
fi

FIXTURE_PNG="fixtures/known-bad-cardwright.png"
FIXTURE_JSON="fixtures/known-bad-cardwright.json"
FAILED=0

check() {
  local label="$1" expected="$2" output="$3"
  if grep -qi -- "$expected" <<<"$output"; then
    echo "  ✓ $label"
  else
    echo "  ✗ $label — expected to find: $expected"
    FAILED=1
  fi
}

echo "validator regression test"
echo

OUT=$($PYTHON_BIN lib/validate.py "$FIXTURE_PNG" "$FIXTURE_JSON" 2>&1)
STATUS=$?

# 1. It must reject the sheet outright.
if [ "$STATUS" -eq 0 ]; then
  echo "  ✗ validator EXITED 0 on the known-bad sheet — the gate is broken"
  FAILED=1
else
  echo "  ✓ non-zero exit on the known-bad sheet"
fi

# 2. It must name the specific defects, not just fail vaguely. Each of these
#    corresponds to something a human had to catch by playing the game.
check "detects the costume change (up row palette drift)" "up:" "$OUT"
check "detects idle/walk scale mismatch (the 25% shrink)" "off the walk" "$OUT"
check "reports actual numbers, not just pass/fail" "median" "$OUT"
check "warns that absolute facing is NOT covered" "facing is NOT checked" "$OUT"

# 3. The healthy row must NOT be flagged — a gate that fails everything is
#    equally useless. `down` legitimately varies (legs lift) and must pass.
if grep -qE '^\s+✗ down:' <<<"$OUT"; then
  echo "  ✗ flagged the healthy 'down' row — false positive"
  FAILED=1
else
  echo "  ✓ no false positive on the healthy 'down' row"
fi


# ---------------------------------------------------------------------------
# Loop-mode gate (validate_object.py loop). Two defects shipped past it into a
# build Raheem played, and each was caught by his eyes rather than by a check:
#
#   the horse   — packed with his hindquarters cropped off the canvas edge
#   the archivist — belt pouch teleporting hip-to-hip between frames
#
# Both fixtures are the REAL shipped assets. The gate must keep failing them.
# ---------------------------------------------------------------------------
echo
echo "loop-mode gate"

OUT=$($PYTHON_BIN lib/validate_object.py loop fixtures/known-bad-clipped-horse.png \
        fixtures/known-bad-clipped-horse.json 2>&1)
if [ $? -eq 0 ]; then
  echo "  ✗ passed the clipped horse — the edge check is broken"
  FAILED=1
else
  echo "  ✓ non-zero exit on the clipped horse"
fi
check "names the clipping, not just a failure" "clipped this frame" "$OUT"

OUT=$($PYTHON_BIN lib/validate_object.py loop fixtures/known-bad-archivist-drift.png \
        fixtures/known-bad-archivist-drift.json 2>&1)
if [ $? -eq 0 ]; then
  echo "  ✗ passed the drifting archivist — the block-drift check is broken"
  FAILED=1
else
  echo "  ✓ non-zero exit on the drifting archivist"
fi
check "localizes the moving prop to a region" "region" "$OUT"

# A gate that fails everything is as useless as one that passes everything. The
# dwarf is the same pipeline and frame count as the archivist, and his loop is
# genuinely clean — he is the control.
OUT=$($PYTHON_BIN lib/validate_object.py loop fixtures/known-good-dwarf-loop.png \
        fixtures/known-good-dwarf-loop.json 2>&1)
if [ $? -eq 0 ]; then
  echo "  ✓ no false positive on the healthy dwarf loop"
else
  echo "  ✗ flagged the healthy dwarf loop — false positive:"
  echo "$OUT" | sed 's/^/      /'
  FAILED=1
fi

echo
if [ "$FAILED" -eq 0 ]; then
  echo "PASS — the gate still catches the defects it was built for."
else
  echo "FAIL — the validator no longer catches known defects. Do not trust it."
  exit 1
fi
