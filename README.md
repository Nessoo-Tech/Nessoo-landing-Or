# Nessoo landing page

The nessoo.com landing page. It's a plain static site: HTML, CSS, JS and media. There's no framework, no package install and no server code.

Live preview: https://nessoo-landing.vercel.app

## Run it locally

    npx serve -l 4321 .

Then open http://localhost:4321. Use `serve` or any real web server. Python's `http.server` doesn't support range requests, so the videos won't play there.

## What's in here

**Served files** (everything a host needs):

| Path | What it is |
|---|---|
| `index.html` | The page. |
| `css/site.css` | Base styles for every section. |
| `css/unify.css` | The shared design layer on top: General Sans, the green palette, the grid, and the newer sections (marketing panel, reels, map cards). |
| `js/main.js` | All behavior: hero film, scroll animations, Homey chat demo, "apartments want you" sheet, reels player, FAQ. |
| `js/vendor/gsap.js` | GSAP + ScrollTrigger, bundled locally. |
| `shared/` | Hero film, section videos, photos, neighborhood map SVGs (`maps/`), Instagram reels (`reels/`). |
| `app/`, `layer/`, `membership/`, `stay/` | Images for the individual sections. |
| `favicon.svg`, `og.jpg` | Tab icon and link-preview image. |

**Not served:** `tools/` (the scripts that generated the page, see below) and this README. `.vercelignore` already excludes them.

## Ship it

1. **Static host (simplest).** Point Vercel, Netlify, Cloudflare Pages or S3 at the repo root. No build step is needed because `index.html` is committed. On Vercel: Framework "Other", empty build command, output directory `.`.
2. **Inside an existing app (Next.js, Astro, etc.).** Copy everything in the table above into its `public/` folder and serve `index.html` at `/`. Asset paths are root-absolute (`/css/...`, `/shared/...`), so the page must be served from the domain root, or those paths need a prefix.

## Before launch

- **Domain in the link-preview tags.** `index.html` points `og:url`/`og:image` at nessoo-landing.vercel.app. Replace that with the real domain, or rebuild with `SITE_URL=https://nessoo.com python3 tools/build.py`.
- **CTAs.** "Get verified", "Sign in", the search box and the Homey chat are front-end demos. Point them at the real signup/app flow (search `href=` in `index.html`).
- **Contact.** The footer email is admin@nessoo.com.
- **Reels.** "Watch on Instagram" opens @nycapartments.nessoo. To open each reel's own post, put its URL in `tools/reels.json` (`url`) and rebuild, or set `data-url` on each `.rl-card` in `index.html`.

## Making changes

You can treat `index.html` as the source and edit it directly. Or keep using the generator in `tools/`, which is how the page was built:

- `tools/build.py` assembles `index.html` and `css/site.css` from the design snapshots in `tools/src/`, then applies the copy and image edits listed in the script. Run `python3 tools/build.py`. Note: once you hand-edit `index.html`, rebuilding would overwrite those edits, so pick one approach.
- `tools/reels.py` turns Instagram screen recordings dropped in `reels-in/` into the web videos in `shared/reels/` (it crops away the Instagram UI). Per-reel captions, crops, trims and preview start times live in `tools/reels.json`. ffmpeg comes from `npm i ffmpeg-static@5.2.0` inside `tools/.ffmpeg`.
- `tools/maps.py` draws the neighborhood map SVGs in `shared/maps/` from OpenStreetMap data (cached in `tools/maps/`). Map data © OpenStreetMap contributors (ODbL); the page shows that credit.
- `tools/og/card.html` is the source for `og.jpg` (screenshot it at 1200×630).

Notes:
- Fonts load from Fontshare (General Sans) and Google Fonts (Instrument Serif, DM Mono).
- Photos are from Unsplash and Pexels (free for commercial use). Reels are Nessoo's own Instagram content.
