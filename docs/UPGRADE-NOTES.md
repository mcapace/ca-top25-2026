# Top 25 of 2026 — design and build notes

The current state of the prototype, how it was checked, and what is still missing.
Screenshots and a recording are in `docs/media/`.

## Editorial study (in review)

`study.html` is a separate page that establishes the next visual system before it is applied
to the whole site: a hero, one ranking row and one detail view. The live page is unchanged.

- **Identity.** Warm white, deep ink, tobacco brown (#4a1b00) and rust (#963700). The last two
  are taken from cigaraficionado.com's own stylesheet. The masthead is the CA logo. Headlines
  and reading text are Newsreader; navigation and specifications are Inter.
- **No labels above headings.** Rank, score and release times sit beneath a title or beside
  the action they belong to.
- **One transformation.** The hero cigar is a single element that travels, as the page scrolls,
  to its place in the Cigar of the Year section and stays there. Nothing is pinned.
- **Light.** A small WebGL shader draws the photograph with a light that follows the pointer
  (or the scroll on touch). The cutout gives the edge, the silhouette gives a round surface,
  and the photographed shadow is kept. Without WebGL the plain photograph is shown.
- **Inspection.** The detail view opens on a table with the cigar drawn to scale against an
  inch ruler, zoom to 300%, drag and keyboard movement, and a second view of the band.
- **Photography limits.** The source photographs are 800 × 200 pixels. The two used in the
  study were enlarged 2× with Runway's precision upscaler, which kept the band artwork and
  wrapper intact on inspection; this is a stand-in. The AI-rendered turn is not used in the
  study, because it is not an authentic turntable.

## Direction

Dark and bold. A near-black page, one heavy expanded typeface (Archivo) and one loud flat
yellow. The biggest lines are sized by script to fill the screen width exactly, so a
headline cannot clip at any size, and nothing is truncated with an ellipsis.

Every cigar is a real photograph, cut out of its white studio background
(`tools/cutouts.py` writes `assets/k<rank>.webp`) so it sits directly on black. There are
no drawn, modelled or illustrated cigars; a sealed place is a number and a date.

**The light.** Each photograph carries a soft highlight masked to the cigar's own outline.
It follows the pointer on a desktop and sweeps along the cigar as it travels up the screen
on a phone. It is one CSS gradient per photo, driven by two custom properties.

Two blocks break the dark on purpose: the sealed No. 1 is a wall of yellow with a live
countdown, and the revealed No. 1 sits on a pale stage, because its turn sequence was
rendered on white.

Earlier versions were reviewed and replaced: a "humidor" look with glass, wood, brass and a
3D cigar in a tube (dated, cramped), then a white typographic version (too stark, text cut off).

## What is on the page

| Part | What it does |
| --- | --- |
| Hero | A sticky stage in a tall track. The headline condenses as it leaves, and scrolling carries the ten best cigars revealed so far across the page as full-size photographs, then hands over to "Twenty-five places" and the 25-number index. Before the first reveal the procession carries the numbers that open next. The page scrolls natively. |
| No. 1 reveal | One 5.2-second sequence: a black room and the numeral 1, the lights come on, the cigar turns from foot-on to its profile, then name and a counting score. Skip, Replay and Escape work; focus stays inside. Reduced motion opens on the final frame. |
| Cigar of the Year | Sealed: a full-width live countdown and a prediction. Open: scrolling through the feature turns the cigar (image sequence scrubbed by scroll). |
| List and grid | The list is the default. The grid has one place per rank; a sealed place shows only its number and day. |
| Detail panel | Photo, rank and title travel from the list into the panel and back (View Transitions API). No. 1 can be turned by slider, keys or drag; other cigars offer a 3D turn built from their photo. |
| Charts | Rank by score, price, length or ring gauge; highlight a country across every chart; hover or focus links the charts; every mark opens the detail panel. Dollars and pounds are separate groups. "Sized up" shows the photographs at one common scale. |

## Technical notes

- Plain HTML, CSS and JavaScript, no build step. First load is about 140 KB of local files plus one variable web font; photographs load as they are needed.
- **3D is on demand.** `stage3d.js` and three.js r160 (vendored, 690 KB) are fetched only when someone presses "Turn it in 3D". Nothing else on the page uses WebGL.
- **Timelines.** The hero, the No. 1 feature and the reveal each run from one number (scroll progress or a clock), so all three are seekable. No animation library is used.
- **Fallbacks.** Without WebGL the 3D button is not offered; everything else is unchanged. With reduced motion the hero and the feature are ordinary sections and the reveal opens complete.
- **Glass** is used in two places only, both floating over content: the header and the presenter bar.

## Assets

Per cigar the repository has one side photograph and one band close-up.

- **The winner's turn** (`assets/spin1/`, 63 frames) was rendered with Runway from the one photograph. It covers 65° head-on to 90° foot-on. It is not a photographed 360°: the ends are generated and the far side is not shown, and the panel says so. Runway has no image-to-3D endpoint, and its attempt at a full turntable morphed at the half-way point.
- **Other cigars' 3D turn** is the side photo wrapped onto its own silhouette (`tools/profiles.py`). The far side is a mirror image, so it is limited to ±60°. Three cigars in white paper sleeves (Nos. 6, 21, 24) have approximate outlines.

### Missing assets

1. Winner: a turntable photo set (24–36 angles) of the real cigar. The scroll turn, the reveal and the panel all take the frames as they are.
2. All cigars: photographs supplied with transparent backgrounds. The cutouts are traced automatically; cigars in white paper sleeves (Nos. 6, 21, 24) and a few head tips are approximate.
3. Approved 2026 content: the list, scores, reviews, photographs, films and confirmed reveal dates.
4. A sponsor mark.

## Verification

Run in headless Chromium at 1280 × 800 and 390 × 844, with WebGL, without it, and with reduced motion.

- Simulator: all six stages give 0, 3, 6, 9, 10 and 25 revealed in the list, the grid and the charts, in every mode, with no console errors and no horizontal overflow.
- Saving, sharing, opening details, the winner's turn and the 3D turn work in every mode where they are offered.
- Keyboard: focus moves into the panel and stays there; in the reveal it starts on Skip, stays inside, and returns to "Read the full review" on close.
- 3D code is not requested until asked for.

**Not yet tested:** any physical phone or desktop. Frame rates have not been measured on real hardware. The page no longer runs any continuous WebGL, so the earlier performance risk is much smaller, but it still needs a pass on a midrange Android phone, an iPhone and an integrated-graphics laptop.

## Before production

The prototype ships every cigar to the browser so reveal week can be simulated. Hiding a sealed cigar on screen does not protect it. Production needs the Top 20's server-side release gate, covering records, photographs, turn frames and outlines.

2025 content and the December 14–18 dates are placeholders and are labelled in the footer and the detail panel.
