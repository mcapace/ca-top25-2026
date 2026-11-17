"""Cuts each cigar out of its white studio background so it can sit on a dark page.

Writes assets/k<rank>.webp (transparent) from assets/c<rank>.webp. The outline is
traced per column: brown, saturated pixels give the top and bottom edge. Where a
white paper band or sleeve hides the edge against the white background, the top
edge comes from "anything that is not pure white" (the drop shadow only falls
below) and the bottom edge is mirrored across the cigar's centre line.
"""
import pathlib, statistics
from PIL import Image, ImageDraw, ImageFilter

root = pathlib.Path(__file__).resolve().parent.parent

def cut(rank):
    im = Image.open(root / "assets" / f"c{rank}.webp").convert("RGB")
    W, H = im.size
    px = im.load()
    strict = lambda p: (max(p) - min(p) > 45 and max(p) < 250) or max(p) < 110
    st, sb, lt = [None] * W, [None] * W, [None] * W
    for x in range(W):
        rows = [y for y in range(H) if strict(px[x, y])]
        if len(rows) > H * 0.12: st[x], sb[x] = rows[0], rows[-1]
        loose = [y for y in range(H) if max(px[x, y]) < 238]
        if len(loose) > H * 0.09: lt[x] = loose[0]
    solid = [None] * W                      # columns that really hold cigar, not just a sliver of shadow
    for x in range(W):
        if lt[x] is not None and sum(1 for y in range(0, H, 2) if max(px[x, y]) < 238) > H * 0.14: solid[x] = lt[x]
    xs = [x for x in range(W) if st[x] is not None or solid[x] is not None]
    x0 = xs[0]
    x1 = max(x for x in range(W) if st[x] is not None) + 1     # the head is never paper: stop at the last leaf-coloured column
    centre_all = statistics.median((st[x] + sb[x]) / 2 for x in range(W) if st[x] is not None)
    def local_centre(x):                    # cigars are rarely dead level, so follow the centre line along the length
        v = sorted((st[i] + sb[i]) / 2 for i in range(max(0, x - 60), min(W, x + 61)) if st[i] is not None and sb[i] - st[i] > H * 0.25)
        return v[len(v) // 2] if v else centre_all
    top, bot = [None] * W, [None] * W
    for x in range(x0, x1 + 1):
        centre = local_centre(x)
        if st[x] is not None and (solid[x] is None or st[x] - solid[x] < 5):
            mirrored = 2 * centre - st[x]
            top[x], bot[x] = st[x], (sb[x] if mirrored - sb[x] < 8 else mirrored)
        else:
            # paper on white: take the outermost edge seen nearby, then mirror it
            near = [solid[i] for i in range(max(x0, x - 14), min(x1, x + 14) + 1) if solid[i] is not None]
            if near: top[x], bot[x] = min(near), 2 * centre - min(near)
    # A pure-white band against the white background leaves columns with no edge at all: bridge them.
    known = [x for x in range(x0, x1 + 1) if top[x] is not None]
    for i in range(len(known) - 1):
        a, b = known[i], known[i + 1]
        for x in range(a + 1, b):
            k = (x - a) / (b - a); top[x] = top[a] + (top[b] - top[a]) * k; bot[x] = bot[a] + (bot[b] - bot[a]) * k
    def med(a, x, k=5):
        v = [a[i] for i in range(max(x0, x - k), min(x1, x + k) + 1) if a[i] is not None]
        return statistics.median(v) if v else None
    mask = Image.new("L", (W, H), 0)
    mp = mask.load()
    for x in range(x0, x1 + 1):
        t, b = med(top, x), med(bot, x)
        if t is None: continue
        for y in range(max(0, round(t) + 1), min(H, round(b))):
            mp[x, y] = 255
    ImageDraw.floodfill(mask, (W // 2, round(centre_all)), 128)           # keep the one connected shape, drop stray specks
    mask = mask.point(lambda v: 255 if v == 128 else 0)
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.9))
    out = im.convert("RGBA"); out.putalpha(mask)
    out.save(root / "assets" / f"k{rank}.webp", quality=84, method=6)
    return (root / "assets" / f"k{rank}.webp").stat().st_size

total = sum(cut(r) for r in range(1, 26))
print("25 cutouts,", total // 1024, "KB")
