"""Assemble the combined Nessoo landing page from the live v1/v2/v3/v5 sources.

Each section is the real markup pulled from the deployed sites. v2 uses
unprefixed class names, so its classes are namespaced with `p-` (in HTML and
CSS) to keep them from colliding with the other three systems.

Run: python3 tools/build.py   (from ~/nessoo-landing)
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "tools", "src")
# Public URL used in the canonical and link-preview tags. Override when moving domains:
#   SITE_URL=https://nessoo.com python3 tools/build.py
SITE_URL = os.environ.get("SITE_URL", "https://nessoo-landing.vercel.app").rstrip("/")
sys.path.insert(0, os.path.join(ROOT, "tools"))
from cssparse import parse  # noqa: E402


def read(p):
    with open(os.path.join(SRC, p), encoding="utf-8") as f:
        return f.read()


def slice_tag(html, start_pat, tag="section"):
    """Return the full element starting at the first match of start_pat."""
    i = html.find(start_pat)
    if i < 0:
        raise SystemExit("not found: " + start_pat)
    depth = 0
    for m in re.finditer(r"<(/?)%s\b[^>]*>" % tag, html[i:]):
        depth += -1 if m.group(1) else 1
        if depth == 0:
            return html[i : i + m.end()]
    raise SystemExit("unbalanced: " + start_pat)


# ---------------------------------------------------------------- v2 prefixing
KEEP = re.compile(r"^(is-|m-|s-|ly-)")


def pfx_classes(value):
    return " ".join(c if (not c or KEEP.match(c)) else "p-" + c for c in value.split())


def v2_html(h):
    h = re.sub(r'class="([^"]*)"', lambda m: 'class="%s"' % pfx_classes(m.group(1)), h)
    h = h.replace("data-reveal", "data-preveal")
    h = re.sub(r"data-hood(?=[\s>])", "data-hoodrow", h)
    return h


def v2_selector(sel):
    sel = re.sub(r"\.(-?[_a-zA-Z][\w-]*)", lambda m: "." + (m.group(1) if KEEP.match(m.group(1)) else "p-" + m.group(1)), sel)
    sel = sel.replace("[data-reveal", "[data-preveal")
    sel = re.sub(r"\bbody\.p-app\b", ".p-app", sel)
    return sel


def transform_css(css, sel_fn=None, keep_fn=None):
    out = []
    for pre, body in parse(css):
        if pre.startswith("@media") or pre.startswith("@supports") or pre.startswith("@container"):
            inner = transform_css(body, sel_fn, keep_fn)
            if inner.strip():
                out.append("%s{%s}" % (pre, inner))
        elif pre.startswith("@"):
            out.append("%s{%s}" % (pre, body))
        else:
            if keep_fn and not keep_fn(pre):
                continue
            out.append("%s{%s}" % (sel_fn(pre) if sel_fn else pre, body))
    return "\n".join(out)


# ---------------------------------------------------------------- sources
v1 = read("v1.html")
v2 = read("v2.html")
v3 = read("v3.html")
v5 = read("v5.html")

# v3: nav + mobile menu + hero, founders, faq, final, footer
v3_nav = slice_tag(v3, '<header class="ly-nav"', "header")
v3_menu = slice_tag(v3, '<div class="ly-menu"', "div")
v3_hero = slice_tag(v3, '<section class="ly-hero"')
v3_founders = slice_tag(v3, '<section class="ly-founders"')
v3_faq = slice_tag(v3, '<section class="ly-faq"')
v3_final = slice_tag(v3, '<section class="ly-final"')
v3_footer = slice_tag(v3, '<footer class="ly-footer"', "footer")

# v1: floating cards, trust grid (its landlord block moves to its own section)
v1_floats = slice_tag(v1, '<section class="fl"')
v1_trust = slice_tag(v1, '<section class="tl"')
v1_trust = re.sub(r'<div class="ll m-container" id="landlords".*?</div></div></div>', "", v1_trust, flags=re.S)
v1_trust = v1_trust.replace('<section class="tl"', '<section class="tl" id="trust"', 1)

# v2: how-it-works stage, neighborhoods, matches, landlords, quotes
v2_stage = slice_tag(v2, '<section class="stage"')
v2_steps_stack = slice_tag(v2, '<section class="steps-stack"')  # mobile / no-pin version of the walkthrough
v2_homey = slice_tag(v2, '<section class="chap homey"')
v2_hood = slice_tag(v2_homey, '<div class="hood">', "div")
v2_chat = slice_tag(v2_homey, '<div class="card chat-card"', "div")
# v2 chat card replaces the v5 Homey section. Its prompts drive the in-phone chat, not the v5 drawer.
v2_chat = v2_chat.replace("data-prompt=", "data-pprompt=").replace("background:#ebe7ff;color:var(--violet)", "background:#dff5e8;color:var(--brand-green)")
v2_chat_section = '<section class="homeysec" id="homey" aria-label="Homey, your AI rental agent">%s</section>' % v2_chat
v2_matches = slice_tag(v2, '<section class="chap matches"')
# Matches collage without the hand-held phone (the walkthrough already shows that screen);
# a "Wants you" photo card fills the slot the phone used to cover.
v2_matches = v2_matches.replace(slice_tag(v2_matches, '<div class="collage-phone"', "div"), "")
v2_matches = v2_matches.replace(
    '<div class="tc tc--gap" aria-hidden="true"></div>',
    '<article class="tc tc--photo"><img src="/app/img/tall-kitchen-morning.webp" alt="A sunny kitchen with plants by the window" loading="lazy">'
    '<p class="tc-cap"><b>Wants you</b>1BR · Greenpoint · $2,875/mo</p></article>',
)
v2_land = slice_tag(v2, '<section class="landlords"')
v2_quotes = slice_tag(v2, '<section class="quotes wrap"')

# The stage opened v2's own hero. Here it opens "How it works", so the hero
# copy becomes the section intro (it still lifts away as the phone rises).
stage_intro = (
    '<div class="hero-copy" data-hero-copy>'
    '<p class="m-eyebrow">How it works</p>'
    '<h2 class="hero-h">The rental process, reversed.</h2>'
    '<p class="hero-sub">You verify once. Homey matches. Landlords come to you. You choose.</p>'
    '<div class="hero-ctas"><a class="pill pill--white pill--lg" href="#steps" data-jump-steps>Walk through it</a></div>'
    "</div>"
)
v2_stage = re.sub(r'<div class="hero-copy" data-hero-copy>.*?</p></div>', stage_intro, v2_stage, count=1, flags=re.S)

# Neighborhoods becomes its own section between Homey and Matches.
v2_hood_section = '<section class="hoods" aria-label="Neighborhood suggestions">%s</section>' % v2_hood

# v5: Homey section, search pill + sheets, launcher, drawer
v5_homey = slice_tag(v5, '<section class="s-section s-homey"')
v5_pill = slice_tag(v5, '<form class="s-pill"', "form")
v5_mpill_i = v5.find('<button type="button" class="s-mpill"')
v5_mpill = v5[v5_mpill_i : v5.find("</button>", v5.find('class="s-mpill__go"', v5_mpill_i)) + 9]
v5_sheet = slice_tag(v5, '<div class="s-sheet"', "div")
v5_sheet_tpl = slice_tag(v5, "<template data-sheet-cards>", "template")
v5_msheet = slice_tag(v5, '<div class="s-msheet"', "div")
v5_launcher_i = v5.find('<button type="button" class="s-launcher"')
v5_launcher = v5[v5_launcher_i : v5.find("</button>", v5_launcher_i) + 9]
v5_drawer = slice_tag(v5, '<div class="s-drawer"', "div")

# Matches ends with a live "try it" band using v5's search pill and results sheet.
try_band = (
    '<div class="s-try" id="try">'
    '<div class="s-try__copy s-reveal"><p class="m-eyebrow">Try it</p>'
    '<h3 class="s-try__h">Tell Homey what you want.</h3>'
    '<p class="s-try__p">Pick a neighborhood, a move-in month and a budget. See the kind of apartments that would reach out to you.</p></div>'
    '<div class="s-try__bar s-reveal" style="--d:80ms">%s%s</div>'
    "</div>"
) % (v5_pill, v5_mpill)

# ---------------------------------------------------------------- page
P = lambda s: v2_html(s)  # noqa: E731

body = "\n".join(
    [
        '<a class="ly-skip" href="#main">Skip to content</a>',
        v3_nav,
        v3_menu,
        '<main id="main">',
        v3_hero,
        # how it works first, then the verification chapter (thesis cards + what gets verified)
        '<div class="p-app">' + P(v2_stage) + P(v2_steps_stack) + "</div>",
        '<div class="m-root">' + v1_floats + v1_trust + "</div>",
        # Homey -> neighborhoods -> matches + try it, then renter proof, then the landlord turn
        '<div class="p-app">' + P(v2_chat_section) + P(v2_hood_section) + P(v2_matches)[: -len("</section>")] + try_band + "</section>" + P(v2_quotes) + P(v2_land) + "</div>",
        v3_founders,
        v3_faq,
        v3_final,
        "</main>",
        v3_footer,
        v5_launcher,
        v5_sheet,
        v5_msheet,
        v5_drawer,
    ]
)

# strip the inline nav <script> that v3 shipped inside its header region (we load it from main.js)
body = re.sub(r"<script type=\"module\">.*?</script>", "", body, flags=re.S)
body = re.sub(r"<script>\s*\(function \(\) \{.*?</script>", "", body, flags=re.S)

# copy rule: no em dashes in Nessoo copy
body = body.replace(" — ", ", ").replace("—", ", ")
# contact address
body = body.replace("hello@nessoo.com", "admin@nessoo.com")

head = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Nessoo · Apartments apply to you</title>
<meta name="description" content="Nessoo is the verified rental exchange for NYC and NJ. Verify once. Homey matches you, landlords come to you, you choose.">
<meta name="theme-color" content="#1f1f1f">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="canonical" href="https://nessoo-landing.vercel.app/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Nessoo">
<meta property="og:url" content="https://nessoo-landing.vercel.app/">
<meta property="og:title" content="Nessoo · Apartments apply to you">
<meta property="og:description" content="Renters verify once. Landlords match and come to you. The verified rental exchange for NYC and NJ.">
<meta property="og:image" content="https://nessoo-landing.vercel.app/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="A couple walking up a brownstone stoop. You don't apply to apartments. Apartments apply to you.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Nessoo · Apartments apply to you">
<meta name="twitter:description" content="Renters verify once. Landlords match and come to you.">
<meta name="twitter:image" content="https://nessoo-landing.vercel.app/og.jpg">
<link rel="preconnect" href="https://api.fontshare.com" crossorigin>
<link rel="preconnect" href="https://cdn.fontshare.com" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap">
<script>
(function () {
  var d = document.documentElement;
  d.classList.add('ly-js', 'm-js', 'p-js', 's-js');
  if (matchMedia('(min-width: 761px) and (min-height: 560px) and (prefers-reduced-motion: no-preference)').matches) d.classList.add('p-can-pin');
})();
</script>
<link rel="stylesheet" href="/css/site.css">
<link rel="stylesheet" href="/css/unify.css">
</head>
<body class="ly-root s-root">
"""
head = head.replace("https://nessoo-landing.vercel.app", SITE_URL)
tail = '\n<script type="module" src="/js/main.js"></script>\n</body>\n</html>\n'

with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8") as f:
    f.write(head + body + tail)

# ---------------------------------------------------------------- css
css_parts = []

# v3 (base reset + ly- system) first: it is the page's foundation
css_parts.append("/* ===== v3 · base + ly- system ===== */\n" + read("v3/Icon.BblNENv_.css") + "\n" + read("v3/index.C6Zhv3CV.css"))

# v1: only the float + trust sections (by their astro scope ids) plus shared ui-/m- utilities
V1_KEEP_CIDS = ("5boi2ukq", "xzbjbqgi")


def v1_keep(pre):
    cids = re.findall(r"data-astro-cid-(\w+)", pre)
    if not cids:
        return True
    return any(c in V1_KEEP_CIDS for c in cids)


css_parts.append(
    "/* ===== v1 · floats + trust grid ===== */\n"
    + transform_css(read("v1/FilmClip.BvqrPJmh.css"), keep_fn=v1_keep)
    + "\n"
    + transform_css(read("v1/index.bI0HLTYl.css"), keep_fn=v1_keep)
)

# v2: stage, neighborhoods, matches, landlords, quotes (namespaced p-)
css_parts.append(
    "/* ===== v2 · stage, matches, landlords, quotes (p-) ===== */\n"
    + transform_css(read("v2/Screen.BSN2TtoE.css"), sel_fn=v2_selector)
    + "\n"
    + transform_css(read("v2/index.X5CCSd8Q.css"), sel_fn=v2_selector)
)

# v5: Homey, search pill, sheets, drawer (s- system)
css_parts.append("/* ===== v5 · Homey, search, sheets (s-) ===== */\n" + read("v5/Icon.xjRFg3ld.css") + "\n" + read("v5/index.C1OndUBV.css"))

os.makedirs(os.path.join(ROOT, "css"), exist_ok=True)
with open(os.path.join(ROOT, "css", "site.css"), "w", encoding="utf-8") as f:
    f.write("\n\n".join(css_parts))

print("built index.html (%d KB) and css/site.css (%d KB)" % (
    os.path.getsize(os.path.join(ROOT, "index.html")) // 1024,
    os.path.getsize(os.path.join(ROOT, "css", "site.css")) // 1024,
))
