"""Street-grid backgrounds for the neighborhood cards.

Pulls street geometry from OpenStreetMap (Overpass API, cached in tools/maps/)
and draws it as a portrait SVG sized to the 270x574 cards. Map data is
© OpenStreetMap contributors (ODbL); the page credits it under the row.

Run: python3 tools/maps.py   (from ~/nessoo-landing; add --refresh to refetch)
"""
import json
import math
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "tools", "maps")
OUT = os.path.join(ROOT, "shared", "maps")

# name: (lat, lon, stroke) centered on the neighborhood
HOODS = {
    "long-island-city": (40.7455, -73.9500, "#37619a"),
    "greenpoint": (40.7290, -73.9535, "#ffffff"),
    "soho": (40.7233, -74.0010, "#ffffff"),
    "upper-east-side": (40.7745, -73.9545, "#ffffff"),
    "hoboken": (40.7440, -74.0300, "#1d3f6e"),
    "long-island-city-white": (40.7455, -73.9500, "#ffffff"),
}
W, H = 540, 1148          # 2x the 270x574 card
SPAN_M = 2300             # card height in meters on the ground
WIDTHS = {"motorway": 7, "trunk": 6, "primary": 5, "secondary": 4.2, "tertiary": 3.6,
          "residential": 2.6, "unclassified": 2.6, "living_street": 2.2, "service": 1.2,
          "pedestrian": 1.6, "footway": 0.9, "path": 0.9, "cycleway": 0.9}


def bbox(lat, lon):
    m_lat = 111_320
    m_lon = 111_320 * math.cos(math.radians(lat))
    half_h = SPAN_M / 2 / m_lat
    half_w = SPAN_M * W / H / 2 / m_lon
    return lat - half_h, lon - half_w, lat + half_h, lon + half_w


def fetch(name, box):
    path = os.path.join(CACHE, name + ".json")
    if os.path.exists(path) and "--refresh" not in sys.argv:
        return json.load(open(path))
    s, w, n, e = box
    q = f'[out:json][timeout:60];way["highway"]({s},{w},{n},{e});out geom;'
    # curl, because the system Python's old OpenSSL can't handshake with Overpass
    raw = subprocess.run(
        ["curl", "-sf", "--max-time", "90", "-A", "nessoo-landing map build",
         "--data-urlencode", "data=" + q, "https://overpass-api.de/api/interpreter"],
        check=True, capture_output=True,
    ).stdout
    data = json.loads(raw)
    json.dump(data, open(path, "w"))
    return data


def svg(data, box, stroke):
    s, w, n, e = box
    def xy(p):
        return (p["lon"] - w) / (e - w) * W, (n - p["lat"]) / (n - s) * H
    groups = {}
    for el in data["elements"]:
        hw = el.get("tags", {}).get("highway")
        if hw not in WIDTHS or "geometry" not in el:
            continue
        pts = " ".join("%d,%d" % xy(p) for p in el["geometry"])
        groups.setdefault(WIDTHS[hw], []).append("M" + pts.replace(" ", "L"))
    paths = "".join(
        f'<path stroke-width="{wd}" d="{"".join(ds)}"/>' for wd, ds in sorted(groups.items())
    )
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">'
            f'<g fill="none" stroke="{stroke}" stroke-linecap="round" stroke-linejoin="round">{paths}</g></svg>')


os.makedirs(CACHE, exist_ok=True)
os.makedirs(OUT, exist_ok=True)
for name, (lat, lon, stroke) in HOODS.items():
    box = bbox(lat, lon)
    out = svg(fetch(name, box), box, stroke)
    with open(os.path.join(OUT, name + ".svg"), "w") as f:
        f.write(out)
    print(name, "%d KB" % (len(out) // 1024))
