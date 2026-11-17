# Cigar Aficionado Top 25 of 2026 — concept prototype

A standalone release landing page for the Top 25, built on what the Top 20
taught us: a staged reveal week, sealed and revealed states, one schedule that
drives everything. Plain HTML, CSS and JavaScript; no build step.

```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

`python3 build-standalone.py` writes `top25-standalone.html`: the same page in one
file with the images inlined, for emailing or opening offline.

## Pages

- **`/`** (`index.html`, `editorial.css`, `editorial.js`): the editorial version. All 25 cigars, a detail view for each, and a Cigar of the Year reveal that can be replayed.
- **`/dark.html`** (`app.js`, `styles.css`): the earlier dark version, kept for comparison. It still has the reveal-week simulator (`?stage=0`–`5`), charts and grid view.

`docs/UPGRADE-NOTES.md` covers the design decisions, the checks that were run and the missing assets.

## What is placeholder

- **Content** is the published Top 25 of 2025 (names, scores, specs, reviews,
  photos, video links), standing in for 2026.
- **Dates** (December 14–18, 10:00 AM ET) are a proposed schedule.
- **Reveal alerts**, the **sponsor slot** and the **ad position** are mock-ups.
- **The winner's turn** is AI-rendered from one photo, not a photographed 360°.
- **The embargo is not real here.** Every cigar ships to the browser so the
  week can be simulated. A production build needs the Top 20's server-side
  release gate (in `mcapace/wa-top20`: `src/lib/release-policy.ts`, `toPublic()`, gated image routes).
