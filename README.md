# Gamseong Photo Booth (감성네컷 Prompt Packs)

Static Astro + React prompt pack library for Korean photo-booth images (Life4Cuts, Single Polaroid, Haru Film 2x2). Users customize visual options (props, pastel/wallpaper backdrops, pose packs, and film moods), reveal the compiled prompt, download a numbered reference file kit, and generate on their own free account in the Gemini app (`gemini.google.com`).

## Commands

```bash
pnpm install
pnpm run dev             # Local dev server
pnpm run validate:packs  # Verify all pack JSONs, asset paths, placeholders, and attachment limits
pnpm run build           # Validate packs + build static site to dist/
pnpm run preview         # Preview built site locally
```

## Adding or Replacing a Prompt Pack

1. Drop your preview image and required template files into:
   `public/assets/packs/<your-slug>/preview.png`
   `public/assets/packs/<your-slug>/files/<template-file>.png`
2. Create `content/packs/<your-slug>/pack.json` (copy `content/packs/bunny-4cut/pack.json` as a starting template).
3. Update `isSample` to `false` once you replace a sample pack with real preview output.
4. Run `pnpm run validate:packs` to verify all file paths, allowed option IDs, defaults, and placeholders.
5. Push to Git: Vercel builds and deploys statically for free.

## Swapping Shared Library Art

- Metadata lives in `content/library/{props,backdrops,poses,moods}.json`.
- Images live in `public/assets/library/{props,backdrops,poses}/`.
- Replace any PNG file with your own artwork of the same filename, or add new entries to the library JSON and reference their IDs in any pack's `allowed` list.

## Optional Footer Support Link

Edit `src/config/site.ts` and set `supportUrl` to your Ko-fi or Buy Me a Coffee link to display the support button in the site footer.
