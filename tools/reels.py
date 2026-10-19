"""Turn raw reels into small web videos for the "New York, on camera." row.

Drop the 7 videos (exports or screen recordings) in reels-in/, named in the
order they should appear (01.mp4, 02.mov, ...). This writes shared/reels/NN.mp4
(720 wide, H.264, sound kept for the tap-to-watch player), NN-preview.mp4
(8 s, silent, 360 wide, for the cards) and NN.jpg posters,
then points tools/reels.json at them, keeping any captions/views/urls already there.

Screen recordings: add "crop": "w:h:x:y" (pixels in the source) to that reel in
reels.json to cut away the browser and comments, then re-run. Add "t": seconds
to stop a reel early (e.g. before Instagram's end-of-reel overlay), and
"preview_at": seconds to pick where the card's 8 s loop (and poster) starts.

Run: python3 tools/reels.py && python3 tools/build.py
ffmpeg comes from tools/.ffmpeg (npm i ffmpeg-static@5.2.0 there).
"""
import json
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IN = os.path.join(ROOT, "reels-in")
OUT = os.path.join(ROOT, "shared", "reels")
CFG = os.path.join(ROOT, "tools", "reels.json")
FFMPEG = os.path.join(ROOT, "tools", ".ffmpeg", "node_modules", "ffmpeg-static", "ffmpeg")

cfg = json.load(open(CFG))
files = sorted(f for f in os.listdir(IN) if f.lower().endswith((".mp4", ".mov", ".m4v", ".webm")))
if not files:
    raise SystemExit("no videos in reels-in/")
os.makedirs(OUT, exist_ok=True)
reels = cfg["reels"]
for i, name in enumerate(files):
    n = "%02d" % (i + 1)
    r = reels[i] if i < len(reels) else {"caption": "", "views": "", "url": ""}
    vf = ("crop=%s," % r["crop"] if r.get("crop") else "") + "scale=720:-2,fps=30"
    src = os.path.join(IN, name)
    at = str(r.get("preview_at", 1))
    dur = ["-t", str(r["t"])] if r.get("t") else []
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", src] + dur + ["-vf", vf, "-c:v", "libx264", "-crf", "27",
                    "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
                    os.path.join(OUT, n + ".mp4")], check=True)
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-ss", at, "-i", src, "-vf", vf, "-frames:v", "1", "-q:v", "4",
                    os.path.join(OUT, n + ".jpg")], check=True)
    # short, silent, small loop for the scrolling cards; the full reel only loads in the player
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-ss", at, "-t", "8", "-i", src, "-vf",
                    vf.replace("scale=720", "scale=360"), "-an", "-c:v", "libx264", "-crf", "30", "-preset", "slow",
                    "-pix_fmt", "yuv420p", "-movflags", "+faststart", os.path.join(OUT, n + "-preview.mp4")], check=True)
    r.update({"video": "/shared/reels/%s.mp4" % n, "preview": "/shared/reels/%s-preview.mp4" % n, "poster": "/shared/reels/%s.jpg" % n, "source": name})
    r.pop("placeholder", None)
    if i >= len(reels):
        reels.append(r)
    print(n, name, "%d KB" % (os.path.getsize(os.path.join(OUT, n + ".mp4")) // 1024))
cfg["reels"] = reels[: len(files)]
json.dump(cfg, open(CFG, "w"), indent=2)
