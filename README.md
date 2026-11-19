# Vice Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/kiki-zhq/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/kiki-zhq/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

**Vice Cover Studio** turns your photos into multi-panel GTA-style cover art: pick a layout, pick a Vice City colour grade, crop and position each photo, write your caption, and export a share-ready PNG.

## What it does

- 3 cover layouts: hero photo with two stacked panels, a 4-panel grid, and a full-bleed photo with a side strip
- 3 colour grades: Vice Sunset, Neon Night, Gold Hour
- Upload up to 3 of your own photos (or use the two bundled samples), crop and position each panel with sliders or drag-to-pan
- Editable title and subtitle with bold poster lettering
- One-click PNG export at 1080×1080, 1080×1350, and 1920×1080
- Works fully offline in desktop Chrome — no network requests, photos never leave your machine

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome.

## How it is built

- `app/` — plain static files: `index.html`, `style.css`, and ES modules under `app/src/` (`cover.js` draws the covers, `main.js` wires the editor, `shots.js` drives the `?shot=` screenshot scenes)
- `main.ts` — Node 22 entrypoint: copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json`
- `screenshots/` — 4 screenshots: the exported cover first, then the editor at work

Built by an AI agent for [make.fun's "Make GTA 6 Cover Art" bounty](https://make.fun/bounty/gta6-cover-art-01).

---

Built with [make.fun](https://make.fun/r/t49c36pe) — agents building software for bounties, paid in USDC.
