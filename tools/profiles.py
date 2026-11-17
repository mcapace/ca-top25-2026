"""Derives a lathe profile for each cigar from its one side photograph.

For every column of assets/c<rank>.webp the cigar's top and bottom edge are
found (brown, saturated pixels; the white background and its grey drop shadow
are ignored), smoothed, and sampled. The browser turns that silhouette into a
body of revolution and projects the same photo back onto it, so each model is
exactly as accurate as its photo and no more: the far side is a mirror image.
Writes the result into data.js as `prof` on each cigar.
"""
import json, pathlib, re, statistics
from PIL import Image

root = pathlib.Path(__file__).resolve().parent.parent
N = 56

def profile(rank):
    im = Image.open(root / "assets" / f"c{rank}.webp").convert("RGB")
    W, H = im.size
    px = im.load()
    tops, bots = [None] * W, [None] * W
    for x in range(W):
        rows = [y for y in range(H) if (lambda p: (max(p) - min(p) > 45 and max(p) < 250) or max(p) < 110)(px[x, y])]
        if len(rows) > H * 0.12:
            tops[x], bots[x] = rows[0], rows[-1]
    # Overall length from a looser test, so paper sleeves and white bands still count.
    xs = [x for x in range(W) if tops[x] is not None or sum(1 for y in range(0, H, 2) if max(px[x, y]) < 236) > H * 0.09]
    x0, x1 = xs[0], xs[-1]
    def smooth(a, x, k=22):
        v = []
        while not v:                                   # widen past columns hidden by a white band
            v = [a[i] for i in range(max(x0, x - k), min(x1, x + k) + 1) if a[i] is not None]
            k *= 2
        return statistics.median(v)
    pts = []
    for i in range(N):
        x = round(x0 + (x1 - x0) * i / (N - 1))
        k = 4 if i < 3 or i > N - 4 else 22          # keep the taper at the ends
        t, b = smooth(tops, x, k), smooth(bots, x, k)
        pts.append([round(x / W, 4), round((t + 1.5) / H, 4), round((b - 1.5) / H, 4)])
    return pts

src = (root / "data.js").read_text(encoding="utf8")
head, body = src.split("window.CA_TOP25 = ", 1)
data = json.loads(body.rstrip().rstrip(";"))
for c in data:
    c["prof"] = profile(c["rank"])
    p = c["prof"]
    print(c["rank"], c["name"][:28].ljust(28), "x", p[0][0], p[-1][0], "mid thickness", round(p[N // 2][2] - p[N // 2][1], 3), "ends", round(p[0][2] - p[0][1], 3), round(p[-1][2] - p[-1][1], 3))
out = json.dumps(data, ensure_ascii=False, indent=1)
out = re.sub(r"\[\s+([\d.]+),\s+([\d.]+),\s+([\d.]+)\s+\]", r"[\1,\2,\3]", out)
(root / "data.js").write_text(head + "window.CA_TOP25 = " + out + ";\n", encoding="utf8")
