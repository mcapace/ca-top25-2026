# Cigar Aficionado Top 25 of 2026 — concept prototype

A standalone release landing page for the Top 25, built on what the Top 20
taught us: a staged reveal week, sealed and revealed states, one schedule that
drives everything. Plain HTML, CSS and JavaScript; no build step.

```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

`python3 build-standalone.py` writes `top25-standalone.html`: the same page in one
file with the images inlined, for emailing or opening offline.

## What it uses

- **Glass:** frosted surfaces over one fixed WebGL smoke field.
- **3D:** `stage3d.js`, one three.js r160 renderer (vendored in `vendor/`) shared by the hero, the sealed No. 1, the reveal and the detail viewer. Loaded after first paint; static posters if it cannot run.
- **Models:** released cigars are built from their side photo (`tools/profiles.py` writes the silhouettes into `data.js`); sealed cigars are procedural.
- **Film:** `assets/hero.mp4` was generated with Runway Gen-4.5.

`docs/UPGRADE-NOTES.md` covers the decisions, the checks that were run, performance status and missing assets. `tools/capture.js` regenerates `docs/media/`.

## Presenting it

The pill at the bottom simulates reveal week: Before, Mon, Tue, Wed, No. 1,
Full list, or "Play the week". `?stage=0`–`5` opens at a given stage; `?no3d` forces the static fallbacks. Moving to
"No. 1" plays the Cigar of the Year reveal.

## What is placeholder

- **Content** is the published Top 25 of 2025 (names, scores, specs, reviews,
  photos, video links), standing in for 2026.
- **Dates** (December 14–18, 10:00 AM ET) are a proposed schedule.
- **Reveal alerts**, the **sponsor slot** and the **ad position** are mock-ups.
- **The embargo is not real here.** Every cigar ships to the browser so the
  week can be simulated. A production build needs the Top 20's server-side
  release gate (in `mcapace/wa-top20`: `src/lib/release-policy.ts`, `toPublic()`, gated image routes).
