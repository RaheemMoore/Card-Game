#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const mode = process.argv[2] ?? '';
let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { input = {}; }

function findProjectRoot(start) {
  let current = path.resolve(start || process.cwd());
  while (true) {
    if (fs.existsSync(path.join(current, '.git')) && fs.existsSync(path.join(current, 'AI_STUDIO_ARCHITECTURE.md'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return path.resolve(start || process.cwd());
    current = parent;
  }
}

const isCodex = mode.startsWith('codex-');
const action = mode.replace(/^codex-/, '');
const root = findProjectRoot(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());

function decision(value, reason) {
  // Codex PreToolUse does not support the Claude "ask" decision. Failing the
  // hook would allow the command, so imported human gates fail closed instead.
  if (isCodex && value === 'ask') {
    value = 'deny';
    reason = `${reason} Run it outside the agent only after reviewing the exact command.`;
  }
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: value, permissionDecisionReason: reason } }));
}
function normalized(value='') { return String(value).replaceAll('\\', '/'); }

function toolTargets(tool, toolInput) {
  const direct = toolInput.file_path ?? toolInput.path;
  if (direct) return [normalized(direct)];
  if (tool !== 'apply_patch') return [];
  const patch = String(toolInput.command ?? '');
  return [...patch.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm)].map((match) => normalized(match[1].trim()));
}

function isSecretPath(file) {
  const basename = file.split('/').at(-1) ?? '';
  return (basename === '.env' || (basename.startsWith('.env.') && basename !== '.env.example')) || /(^|\/)secrets?(\/|$)/i.test(file);
}

if (action === 'session-start') {
  console.log('Card Engine Studio V2: use FAST/STANDARD/FULL routing; agents advise, skills execute; paid/destructive/remote actions and subjective visual approval remain human gates. Architecture: AI_STUDIO_ARCHITECTURE.md. Registry: .claude/studio/STUDIO_CAPABILITY_REGISTRY.json.');
  process.exit(0);
}

if (action === 'pre-tool') {
  const tool = input.tool_name ?? '';
  const ti = input.tool_input ?? {};
  if (tool === 'Edit' || tool === 'Write' || tool === 'apply_patch') {
    const files = toolTargets(tool, ti);
    if (files.some(isSecretPath)) {
      decision('deny', 'Secret/environment files are protected by the studio policy. Use .env.example for structure and never expose values.');
      process.exit(0);
    }
    if (files.some((file) => /(^|\/)IMAGE_ENGINE_REFERENCE\.md$/.test(file))) {
      decision('deny', 'IMAGE_ENGINE_REFERENCE.md is generated from code. Change live Image Engine source and run npm run docs:engines instead.');
      process.exit(0);
    }
  }
  if (tool === 'Bash') {
    const command = normalized(ti.command ?? '');
    if (/\brm\s+-rf\s+(?:\/|~|\$HOME)(?:\s|$)/i.test(command)) {
      decision('deny', 'Destructive removal of root/home is blocked by project policy.');
      process.exit(0);
    }
    if (/\b(cat|type|more|less|sed|awk|grep|rg)\b[^\n]*(?:^|\/)\.env(?:\.|\s|$)/i.test(command)) {
      decision('deny', 'Reading secret .env contents through Bash is blocked.');
      process.exit(0);
    }
    // Destructive git. Note the flag forms deliberately avoid a trailing \b: a greedy
    // class followed by \b let `git clean -fd` and `-fdx` escape while only `-f` matched.
    if (/\bgit\s+(push\s+(--force|-f)\b|reset\s+--hard\b|clean\s+-\S*f|branch\s+-D\b|worktree\s+remove\b|checkout\s+--\s|restore\s)/i.test(command)) {
      decision('ask', 'This command can rewrite or destroy shared/local history, working-tree changes, or a worktree holding in-flight work. Human confirmation is required.');
      process.exit(0);
    }
    // Recursive removal of a relative path. Root/home is denied outright above; this
    // catches `rm -rf card-engine/src`, which is just as destructive to unpushed work.
    if (/\brm\s+(-\S*r\S*\s+|-\S*f\S*\s+)*-?\S*[rf]\S*\s+\S/i.test(command) && /\brm\s+-\S*r/i.test(command)) {
      decision('ask', 'Recursive removal can destroy uncommitted work. Confirm the exact path.');
      process.exit(0);
    }
    // New dependencies are out of scope unless explicitly authorized. Bare `npm install`
    // / `npm ci` (restoring the existing lockfile) stay allowed.
    if (/\bnpm\s+(install|i|add)\s+(?!-)\S/i.test(command) || /\b(pnpm|yarn|bun)\s+add\s+\S/i.test(command)) {
      decision('ask', 'Adding a new external dependency requires human approval.');
      process.exit(0);
    }
    if (/sprite-lab\.mjs\s+gen\b|bg-harness\/harness\.mjs\s+gen\b/i.test(command)) {
      decision('ask', 'This command can spend PixelLab/Leonardo credits. Confirm the approved batch, estimated calls, and stop limit.');
      process.exit(0);
    }
    if (/\b(git\s+push|gh\s+pr\s+create|vercel\b|supabase\s+db\s+push|npm\s+publish)\b/i.test(command)) {
      decision('ask', 'Remote, deployment, database, or publishing action requires human confirmation.');
      process.exit(0);
    }
  }
  process.exit(0);
}

if (action === 'post-write') {
  const files = toolTargets(input.tool_name ?? '', input.tool_input ?? {});
  const touchesStudio = files.some((file) =>
    file.includes('/.claude/') || file.startsWith('.claude/')
  );
  if (!touchesStudio) process.exit(0);
  const lint = spawnSync(process.execPath, [path.join(root, '.claude/scripts/studio-lint.mjs')], { cwd: root, encoding: 'utf8' });
  if (lint.status !== 0) {
    process.stderr.write(lint.stdout || 'Studio lint failed after the edit.\n');
    process.stderr.write(lint.stderr || '');
    process.exit(2);
  }
  process.exit(0);
}

process.exit(0);
