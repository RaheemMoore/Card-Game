# card-engine

React + Vite + TypeScript app. This is the Card Engine — a fantasy TCG in mid-Phase 1.

Canonical project docs live at the repo root — see [../CLAUDE.md](../CLAUDE.md) for full context (data model, project structure, phase status, economy governance).

## Quick start

```bash
npm install
npm run dev        # dev server on :5173
npm run test       # vitest (economy tests)
npm run build      # tsc -b && vite build
npm run lint       # oxlint
```

Requires only public Supabase client values to use the `VITE_` prefix. Anthropic and Leonardo keys are server-only (`ANTHROPIC_API_KEY`, `LEONARDO_API_KEY`) and must never be exposed as Vite variables; the browser calls the protected `/api/*` proxies. Offline art scripts read provider keys from `.env.local`. See `.env.example`.

## Verify a change

Run the project verify script — layered checks, fastest first:

```bash
../.claude/verify/card-engine.sh
```

Or via the built-in `verify` skill in a Claude Code session.
