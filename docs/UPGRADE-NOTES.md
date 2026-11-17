# The Collector's Humidor — upgrade notes

What was built against the upgrade brief, how it was checked, and what is still missing.
Screenshots and the recording are in `docs/media/`.

## What changed

| Brief item | What it is now |
| --- | --- |
| 1. Hero transformation | A tall track with a sticky stage. Scrolling pushes the camera in, slides the cap and glass off a sealed cigar, and hands over to "Twenty-five places", the 25-number ladder. The headline and "Open the humidor" are readable at scroll position zero. The page scrolls natively; nothing captures the wheel or touch. |
| 2. No. 1 reveal | One 5.4-second timeline: dark frosted tube, light comes up, cap and glass slide off, a little smoke, the cigar settles, then rank, name and a counting score. Skip jumps to the end, Replay runs it again, Escape closes. Focus stays inside it and the rest of the page is inert. |
| 3. Humidor view | A List / Humidor switch. The cabinet has one cedar place per rank. Released places show photo, name and score and open the same detail panel. Sealed places show only their number and opening day. |
| 4. Continuous detail | Opening a cigar from a row, a cabinet place or the feature carries its photo, rank and title into the panel, and back on close (View Transitions API). "Turn it in 3D" rotates a model of the cigar, by drag or by a labelled slider. |
| 5. Charts | "Rank the list your way": order by score, price, length or ring gauge, either direction; bars slide to their new place. Choosing a country highlights it in every chart. Hovering or focusing a cigar in one chart marks it in the others. Every mark opens the detail panel. Dollar and pound prices are separate groups with separate scales. |

## Technical decisions

- **Architecture kept.** Plain HTML, CSS and JavaScript, no build step. `stage3d.js` is the only ES module.
- **three.js r128 → r160.** r128 was loaded as a global from a CDN before the page's own script. r160 is vendored (`vendor/three.module.min.js`) and imported by `stage3d.js`, which `app.js` loads 200 ms after the `load` event. That removes the CDN dependency and gets text, poster and navigation on screen before any 3D code is requested.
- **Timeline.** GSAP ScrollTrigger was considered and not added. The hero needs one number (progress through the track) and the reveal needs one clock; both are a few lines, and both are seekable, which is what Skip, Replay and the frame-stepped recording rely on.
- **One renderer.** A single WebGL context and canvas is moved between four hosts: hero, sealed No. 1, the reveal and the detail viewer. It renders only while its host is on screen and the tab is visible, and under reduced motion only when something changes.
- **Weaker devices.** Pixel ratio is capped at 2 (1.5 on narrow or low-memory devices, with antialiasing off). A frame-rate guard samples 24 frames after load; if the median is slower than 34 ms it switches to "lite": no live blur, no ambient smoke shader, hero film paused, 3D at pixel ratio 1.
- **Fallbacks.** No WebGL, a failed module load, or `?no3d`: the hero shows a rendered poster, the sealed No. 1 shows its gold seal, the reveal uses the photograph, and "Turn it in 3D" is not offered. Reduced motion: the hero is an ordinary section and the reveal opens on its final frame.
- **Decoration never takes input.** The 3D canvas, film and smoke have `pointer-events: none`; only the sealed tube and the detail viewer accept a drag, and both keep vertical touch scrolling.

## Asset audit and the modelling approach

Per cigar the repository has one side photograph (1400 × 350) and one band close-up (520 × 520). That is not enough for a photoreal model, so:

- **Released cigars** are built from the side photo. `tools/profiles.py` traces the silhouette, the browser turns it into a body of revolution and projects the same photo back onto it. Shape and front face are true to the photo; the far side is its mirror image, so rotation is limited to ±60°.
- **Sealed cigars** are procedural (leaf texture, numbered band) so nothing about an unreleased cigar is drawn.
- The winner gets no better treatment than the others yet, because its assets are no better. Three cigars with white paper sleeves (Nos. 6, 21, 24) have approximate silhouettes where white paper meets the white background.

### The winner's turn (Runway)

Runway has no image-to-3D endpoint, so a 360° was attempted as an image-to-video turntable (Veo 3.1, the photo as both first and last frame). It did not produce a true 360°: the clip turns the cigar about 100° until the foot faces the camera, then morphs the foot into the head and turns back. A generated back view to anchor two half-turns came out as a different, straight-sided cigar, so that route was stopped.

What ships is the part of the clip that holds together: 63 evenly spaced frames from 65° head-on to 90° foot-on (`assets/spin1/`), shown in the winner's detail panel with a slider and drag. It works without WebGL. The panel says it is AI-rendered, that the ends are generated, and that the far side is not shown. A real 360° still needs item 1 below.

### Missing assets

1. Winner: a turntable photo set (24–36 angles) or a photogrammetry scan, for a true 360° model.
2. Winner: flat band artwork, so the band can be a real texture instead of a projected photo.
3. All cigars: photos on transparent or neutral grey backgrounds. White backgrounds are why white sleeves are hard to trace.
4. A studio HDRI for reflections. The current one is generated in code.
5. Approved 2026 content: the list, scores, reviews, photos, films and confirmed reveal dates.
6. A sponsor mark, and a final decision on the two Runway clips. Only the hero clip is still used.
7. A compressed-texture pipeline (KTX2/Basis) once real textures exist. Today's textures are small WebP files and canvases, which did not justify adding the transcoder.

## Verification

Run in headless Chromium at 1440 × 900 and 390 × 844, with 3D, with `?no3d`, and with reduced motion.

- Simulator: all six stages give 0, 3, 6, 9, 10 and 25 revealed in the list, the cabinet and the charts, in all three modes, with no console errors.
- Browsing, saving, sharing and opening details work in all three modes.
- Keyboard: Enter on a cigar moves focus into the panel and Tab stays there; Escape closes it. In the reveal, focus starts on Skip, Enter skips, Tab stays inside, Escape closes.
- No horizontal overflow at either width.
- Load order: about 600 KB before the `load` event excluding the hero film; 690 KB of 3D code is requested only after it.

### Performance: not yet measured on real devices

No physical phone or desktop GPU was available. Headless Chromium here renders WebGL in software, so its frame rates (5–16 fps in the hero, 9–38 in the reveal) say nothing about a real GPU. They did confirm that the lite-mode guard triggers and applies.

Still to do before sign-off: profile on one midrange Android phone, one recent iPhone and one integrated-graphics laptop; record frame times for the hero scroll and the reveal; confirm whether lite mode triggers on each.

## Before production

The prototype ships every cigar to the browser so reveal week can be simulated. Hiding a sealed cigar on screen does not protect it. Production needs the Top 20's server-side release gate: unreleased records and photos stay on the server, and the 3D profiles must be gated with them, since a silhouette is embargoed information too.

2025 content and the December 14–18 dates remain placeholders and are labelled as such in the footer and the detail panel.
