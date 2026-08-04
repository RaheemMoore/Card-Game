# Card Engine Studio Wiki

The repository-backed visual and production Wiki for Card Engine. It is an independent
React/Vite application that deploys separately from the playable game while sharing the same
canonical documents and optimized web assets.

## Local development

```powershell
cd studio-wiki
npm install
npm run dev
```

## Content model

- `PRODUCTION.md` is imported at build time through the content adapter in `vite.config.ts`.
- Web-sized game assets are reused from `card-engine/public/assets` without duplication.
- Full-resolution originals can remain in future OpenNest storage; the Wiki is their catalog,
  not their only storage location.
- Missing or uncommitted media must use an honest pending state rather than substitute art.

## Deployment boundary

Deploy this directory as its own Vercel project and URL. `vercel.json` preserves direct links
to Wiki sections. Deployment and access protection require Raheem's separate approval.
