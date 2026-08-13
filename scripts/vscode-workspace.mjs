#!/usr/bin/env node
/**
 * Generates "Card Game.code-workspace" — a multi-root VS Code workspace that
 * puts the worktree Claude is currently working in RIGHT NEXT TO the repo root,
 * so Raheem can watch files change live instead of hunting for them.
 *
 * Why this is generated and not hand-written: this repo carries ~26 worktrees
 * and the active one changes every session. A checked-in folder list is stale
 * on day two.
 *
 *   node scripts/vscode-workspace.mjs                    # root + main only
 *   node scripts/vscode-workspace.mjs versus-code        # + any worktree matching
 *   node scripts/vscode-workspace.mjs combat courtyard   # several at once
 *   node scripts/vscode-workspace.mjs --list             # show what's available
 *
 * Matching is a case-insensitive substring against the worktree folder name and
 * its branch, so partial names are fine.
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { relative, basename, join } from 'node:path';

const git = (args, cwd) =>
  execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

/** Parse `git worktree list --porcelain` into {path, branch, detached}. */
function readWorktrees(cwd) {
  const out = git(['worktree', 'list', '--porcelain'], cwd);
  const trees = [];
  let current = null;
  for (const line of out.split('\n')) {
    if (line.startsWith('worktree ')) {
      current = { path: line.slice(9).trim(), branch: null, detached: false };
      trees.push(current);
    } else if (line.startsWith('branch ')) {
      current.branch = line.slice(7).trim().replace(/^refs\/heads\//, '');
    } else if (line.trim() === 'detached') {
      current.detached = true;
    }
  }
  return trees;
}

const args = process.argv.slice(2);
const listOnly = args.includes('--list');
const patterns = args.filter((a) => !a.startsWith('--')).map((s) => s.toLowerCase());

// The FIRST entry of `git worktree list` is always the main working tree,
// regardless of which worktree we happen to be invoked from.
const trees = readWorktrees(process.cwd());
const root = trees[0];
const others = trees.slice(1);

if (listOnly) {
  console.log(`root  ${root.path}  [${root.branch ?? 'detached'}]`);
  for (const t of others) {
    console.log(`      ${basename(t.path).padEnd(46)} [${t.branch ?? 'detached'}]`);
  }
  process.exit(0);
}

const matches = (t) => {
  const hay = `${basename(t.path)} ${t.branch ?? ''}`.toLowerCase();
  return patterns.some((p) => hay.includes(p));
};

const active = others.filter(matches);
const mainTree = others.find((t) => t.branch === 'main');

// Relative paths keep the workspace file portable across machines.
const rel = (p) => {
  const r = relative(root.path, p).replace(/\\/g, '/');
  return r === '' ? '.' : r;
};

const folders = [];

// Active worktrees go FIRST — the explorer reads top-down, and the whole point
// is that live edits are the thing you should not have to scroll to find.
for (const t of active) {
  folders.push({ name: `>> ACTIVE  ${basename(t.path)}  [${t.branch ?? 'detached'}]`, path: rel(t.path) });
}

folders.push({ name: `Card Game  (root) [${root.branch ?? 'detached'}]`, path: '.' });

if (mainTree && !active.includes(mainTree)) {
  folders.push({ name: 'main  (reference)', path: rel(mainTree.path) });
}

const workspace = {
  folders,
  settings: {
    // Multi-root means the same file can appear under several folders; excluding
    // nested worktrees from the root folder's searches stops every hit tripling.
    'search.exclude': {
      '**/node_modules': true,
      '**/dist': true,
      '**/.vercel': true,
      '.claude/worktrees/**': true,
      'ai-snapshot-output': true,
    },
    // Deliberately NOT excluding .claude/worktrees here. Workspace settings
    // apply to every folder, and the active worktree lives under that path —
    // excluding it would stop VS Code watching the very files this workspace
    // exists to show changing live. node_modules carries the bulk of the cost
    // and is excluded, which is what actually matters for watcher limits.
    'files.watcherExclude': {
      '**/node_modules/**': true,
      '**/dist/**': true,
      '**/.git/objects/**': true,
    },
    // Live-watching aids: show which files changed, and keep them open.
    'workbench.editor.enablePreview': false,
    'explorer.autoReveal': true,
    'scm.alwaysShowRepositories': true,
    'git.openRepositoryInParentFolders': 'always',
  },
  extensions: {
    recommendations: ['anthropic.claude-code', 'usernamehw.errorlens', 'eamodio.gitlens'],
  },
};

const outPath = join(root.path, 'Card Game.code-workspace');
writeFileSync(outPath, JSON.stringify(workspace, null, 2) + '\n', 'utf8');

console.log(`Wrote ${outPath}`);
for (const f of folders) console.log(`  ${f.name}  ->  ${f.path}`);
if (patterns.length && active.length === 0) {
  console.log(`\nNo worktree matched: ${patterns.join(', ')}  (try --list)`);
}
