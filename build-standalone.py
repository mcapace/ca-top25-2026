"""Bundles the prototype into one self-contained HTML file (images inlined) for emailing or opening offline."""
import base64, pathlib, re

here = pathlib.Path(__file__).parent
html = (here / "index.html").read_text(encoding="utf8")
css = (here / "styles.css").read_text(encoding="utf8")
js = (here / "data.js").read_text(encoding="utf8") + "\n" + (here / "app.js").read_text(encoding="utf8")
MIME = {".mp4": "video/mp4", ".jpg": "image/jpeg"}
uris = {p.name: f"data:{MIME.get(p.suffix, 'image/' + p.suffix[1:])};base64," + base64.b64encode(p.read_bytes()).decode() for p in (here / "assets").iterdir()}

html = html.replace('<link rel="stylesheet" href="styles.css">', f"<style>{css}</style>")
html = html.replace('<script src="data.js"></script>\n<script src="app.js"></script>', "<script>window.CA_ASSETS=" + repr(uris).replace("'", '"') + ";</script>\n<script>" + js.replace("</script", "<\\/script") + "</script>")
# Static <img> tags point at their data URI; images created by script look theirs up in CA_ASSETS.
html = re.sub(r'src="assets/([\w.-]+)"', lambda m: f'src="{uris[m.group(1)]}"', html, count=0)
html = re.sub(r'src=\\?"assets/(c|b)\$\{([^}]+)\}\.webp\\?"', r'src="${window.CA_ASSETS[`\1${\2}.webp`]}"', html)
html = html.replace('src="assets/c1.webp"', f'src="{uris["c1.webp"]}"')
(here / "top25-standalone.html").write_text(html, encoding="utf8")
print("wrote", (here / "top25-standalone.html").stat().st_size // 1024, "KB")
