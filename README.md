# Nessoo landing (combined)

One page built from the live sections of nessoo-v1, v2, v3 and v5.

| Section | Source |
|---|---|
| Nav, film hero with live Homey card + chapter tabs | v3 |
| How it works: pinned phone walkthrough ("verify once.") | v2 |
| "Verified once. Trusted everywhere." floating cards | v1 |
| "What gets verified. What landlords see." photo grid | v1 |
| "Talk to Homey like a friend." chat card with in-phone demo | v2 |
| Neighborhoods row | v2 |
| "Matches." collage (phone removed, kitchen card added) | v2 |
| Try it: search pill → "3 apartments want you" sheet | v5 |
| Renter quotes, then landlords card | v2 |
| Founders, FAQ, closing film, footer (fill-ins) | v3 |

## Files
- `index.html`: generated. Don't hand-edit; run the build.
- `css/site.css`: generated, the original CSS of each design (v2 classes namespaced `p-`).
- `css/unify.css`: hand-written. One font (General Sans), one green palette, one grid, one eyebrow style.
- `js/main.js`: hand-written. Ports each design's behavior.
- `tools/build.py`: pulls sections out of `tools/src/*.html` (snapshots of the live sites) and assembles the page.

## Run
    python3 tools/build.py
    npx serve -l 4321 .     # needs range requests for the videos; python http.server won't play them

## Handoff: putting this on the real domain

This is a plain static site: HTML, CSS, JS and media. There's no framework, no package install and no server code. Everything in the repo root except `tools/` and `README.md` is what gets served (about 19 MB, mostly video and photos in `shared/`, `stay/`, `membership/`).

**Before launch:** set the real domain in the link-preview tags, then rebuild:

    SITE_URL=https://nessoo.com python3 tools/build.py

Ways to ship it:

1. **Any static host (simplest).** Point Vercel, Netlify, Cloudflare Pages or S3 at the repo root. No build command is needed because `index.html` is committed. On Vercel: import the repo, Framework "Other", leave build command empty, output directory `.`.
2. **Inside an existing app (Next.js, Astro, etc.).** Copy `index.html`, `favicon.svg`, `og.jpg`, `css/`, `js/`, `app/`, `layer/`, `membership/`, `shared/`, `stay/` into its `public/` folder and serve `index.html` at `/`. Asset paths are root-absolute (`/css/...`, `/shared/...`), so the page must be served from the domain root, or those paths need a prefix.

Notes:
- Fonts load from Fontshare (General Sans) and Google Fonts (Instrument Serif, DM Mono).
- GSAP is bundled locally in `js/vendor/gsap.js`, so there's no CDN dependency.
- Hosts must support HTTP range requests for the `.mp4` files. Every real host does, but Python's `http.server` doesn't.
- The "Get verified", search and Homey interactions are front-end demos. Wire the CTAs to the real signup flow where needed (search `href=` in `tools/build.py` / `index.html`).
- To change content, edit `tools/build.py`, `css/unify.css` or `js/main.js`, then rebuild. Or treat `index.html` as the source from here on and drop `tools/`.
