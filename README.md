# Cigar Aficionado Top 25 of 2026 — concept prototype

A standalone release landing page for the Top 25, built on what the Top 20
taught us: a staged reveal week, sealed and revealed states, one schedule that
drives everything. Plain HTML, CSS and JavaScript; no build step.

```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

`python3 build-standalone.py` writes `top25-standalone.html`: the same page in one
file with the images inlined, for emailing or opening offline.

## Presenting it

The pill at the bottom simulates reveal week: Before, Mon, Tue, Wed, No. 1,
Full list, or "Play the week". `?stage=0`–`5` opens at a given stage. Moving to
"No. 1" plays the Cigar of the Year reveal.

## What is placeholder

- **Content** is the published Top 25 of 2025 (names, scores, specs, reviews,
  photos, video links), standing in for 2026.
- **Dates** (December 14–18, 10:00 AM ET) are a proposed schedule.
- **Reveal alerts**, the **sponsor slot** and the **ad position** are mock-ups.
- **The embargo is not real here.** Every cigar ships to the browser so the
  week can be simulated. A production build needs the Top 20's server-side
  release gate (in `mcapace/wa-top20`: `src/lib/release-policy.ts`, `toPublic()`, gated image routes).
