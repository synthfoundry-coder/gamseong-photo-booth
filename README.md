# Gamseong Photo Booth (감성네컷 Prompt Packs)

Static Astro + React prompt pack library for Korean photo-booth images (Life4Cuts, Single Polaroid, Haru Film 2x2), plus an unlisted password-protected `/admin` studio backed by GitHub atomic commits on Vercel.

## Commands

```bash
pnpm install
pnpm run dev             # Local dev server (includes /admin in local-file dev mode)
pnpm run validate:packs  # Verify all pack JSONs, asset paths, placeholders, and attachment limits
pnpm run build           # Validate packs + build for Vercel (static public pages + /admin API routes)
pnpm run preview         # Preview built site locally
```

## Private Admin Studio (`/admin`)

Visit `/admin` directly (it is unlisted, blocked in `public/robots.txt`, and marked `noindex, nofollow`).

Inside `/admin`, you can:
- Add, edit, and delete **Prompt Packs**, replace **preview images**, manage **strip templates / required files**, configure allowed options & defaults, and edit **premade prompt templates** with clickable placeholder chips and a live compiled preview.
- Add, edit, and delete **Shared Library** items (**Props**, **Backdrops**, **Poses**, **Moods**) with automatic image resizing and safe-delete checks.
- Stage multiple edits and publish them as **one atomic GitHub commit** (1 Vercel deploy per publish).

### One-Time Vercel Environment Variable Setup

In your Vercel Project Settings -> **Environment Variables**, add:

| Variable | Description |
|---|---|
| `ADMIN_PASSWORD` | Your private admin password. |
| `ADMIN_SESSION_SECRET` | Random 32+ character string used to sign the `HttpOnly` session cookie (e.g. `openssl rand -hex 32`). |
| `GITHUB_TOKEN` | Fine-grained GitHub Personal Access Token scoped **only** to `synthfoundry-coder/gamseong-photo-booth` with **Contents: Read and write** permission. |

Optional overrides if you rename or fork the repository:
- `GITHUB_OWNER` (default: `synthfoundry-coder`)
- `GITHUB_REPO` (default: `gamseong-photo-booth`)
- `GITHUB_BRANCH` (default: `main`)

### Local Testing Without a GitHub Token

When running `pnpm run dev` locally without `ADMIN_PASSWORD` or `GITHUB_TOKEN`:
- Default local dev password is `dev-admin` (or set `ADMIN_PASSWORD` in a local `.env` file).
- Publishing saves directly to your local `content/` and `public/assets/` folders so you can test the entire workflow before deploying to Vercel.

## Optional Footer Support Link

Edit `src/config/site.ts` and set `supportUrl` to your Ko-fi or Buy Me a Coffee link to display the support button in the site footer.
