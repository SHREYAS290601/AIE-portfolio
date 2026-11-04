# Design System: Shreyas Kulkarni, AI Data Engineer

## Product Context
- **What this is:** a scroll-driven portfolio where one pangram ("Quick, fix the hazy JSON dump; verbose logs win.") replicates and mutates into every line of the page, and DevTools-style inspector boxes measure each element as it lands.
- **Who it's for:** hiring managers and engineers judging data and AI engineering work.
- **Project type:** single-page portfolio, content-first, motion as the argument.
- **Memorable thing:** the page does to text what Shreyas does to data: raw, then structured, then measured, then verified.

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian crossed with instrument UI. A debugger, not a poster.
- **Decoration:** intentional. One scanline overlay, faint blueprint outlines of finished sections. No gradients, no blobs, no icon grids.
- **Mood:** calm precision that starts noisy. Glitch is loud at the top and decays as the page gets verified.

## Typography
- **Display, headings, numbers, labels, HUD, pool:** Martian Mono (variable, 100 to 800). Uniform glyph slots for replication; wide, technical, not the default mono every dev site uses.
- **Body:** Instrument Sans (variable). Readable at length next to a wide mono; narrow enough to keep lines dense.
- **Loading:** self-hosted via `@fontsource-variable/*` (bundled, same origin, CSP friendly). Measurement waits for `document.fonts.ready`.
- **Scale (px, all integers so inspector labels read whole px):**
  | Token | Size / line-height | Use |
  |---|---|---|
  | `--fs-hero` | 64 / 72 (mobile 32 / 40) | pangram in hero |
  | `--fs-display` | 56 / 64 (mobile 36 / 44) | name, SIGNAL numbers |
  | `--fs-h2` | 40 / 48 (mobile 28 / 36) | section headings |
  | `--fs-h3` | 24 / 32 | role titles, case-study titles |
  | `--fs-body` | 18 / 28 | body |
  | `--fs-small` | 14 / 20 | captions, chips |
  | `--fs-label` | 12 / 16 | inspector labels, HUD |

## Color
- **Approach:** restrained. Neutrals carry text; accents carry instrumentation.
- `--bg #252525`, `--surface #2E2E2E`.
- `--text #E4E7EA` and `--text-muted #A3ABB2` for all copy (contrast verified in code, both above 4.5:1). Body copy never uses accents.
- `--accent-cyan #64DFDF`: inspector strokes, links, heading accents.
- `--accent-mint #80FFDB`: label chips (with `#252525` text), focus ring.
- `--accent-purple #6930C3` (about 2:1): glows, RGB-split offsets, margin tints, large shapes only. Never text.
- **Dark only.** `color-scheme: dark`.

## Spacing
- **Base unit:** 4px. Scale `--s-1 4` `--s-2 8` `--s-3 12` `--s-4 16` `--s-6 24` `--s-8 32` `--s-12 48` `--s-16 64` `--s-24 96` `--s-32 128`.
- Every box dimension the inspector reports must be a whole px; if one isn't, fix the token, never the label.

## Layout
- **Grid:** 12 columns, 24px gutters, max content width 1200px, side gutter 16px under 768px.
- **Sections:** full-viewport, left-aligned on the grid, asymmetric. No centered stacks except the hero.
- **Radius:** 0 for boxes and chips (instrument UI), 2px only on focus rings.

## Motion
- **Engine split:** GSAP owns anything scroll-driven (particles, flights, inspector, HUD values). Motion is reserved for hover, cursor, and the full-log toggle; never both on one element.
- **Easing:** flights `power3.inOut`; inspector stroke `power2.out`; scrubbed fades linear.
- **Scrub:** everything maps to scroll progress and reverses.
- **Reduced motion:** no replication, flight, scramble, flicker, or inspector boxes. Static text, section crossfades only.
- **Flicker:** at most 3 per second anywhere (WCAG 2.3.1).

### Glitch by section (decays down the page)
| Section | Glitch | Inspector |
|---|---|---|
| Hero | idle slice jitter every 4 to 6 s, 2px RGB split | none |
| Intro | source glyphs stutter and RGB-split as they emit; case flips mid-flight | word and heading boxes |
| SIGNAL | heaviest: digits decode from lookalike letters (o to 0, s to 5), 4px split | per number, per caption line, section |
| WORK | scanline sweep as each role lands | per line, section |
| SYSTEMS | almost none; this is the measured stage | every diagram node |
| STACK | cloud jitter, then sort; split only while unsorted | per category, section |
| SCHOOL | decode only | section |
| CONTACT | one full-page slice as everything collapses into the pool | HUD freezes |

## Decisions Log
| Date | Decision | Rationale |
|---|---|---|
| 2026-11-03 | Initial system via /design-consultation | Concept and palette pre-approved at Checkpoint 1; the live prototype is the preview. |
| 2026-11-03 | ~~Pool docks to a fixed top-left strip~~ Pool shrinks in place to a dim (22%) centered source behind the text | User feedback: the corner pulled focus. Center keeps the eye still; particles burst outward. |
| 2026-11-03 | Each section assembles all at once (random launch jitter), then gets measured in reading order | User feedback: words should arrive together. Keeps the arc raw, structured, measured. |
| 2026-11-03 | One-shot full-screen slice glitch on first scroll: #00FF85, #FF2E97, white, black | User request (Spider-Verse feel). The only place these off-palette colors appear. 3 pulses in 0.6 s, the WCAG 2.3.1 ceiling. Skipped under reduced motion; armed only after the hero top is seen. |
| 2026-11-03 | three.js background (lazy-loaded), Spartan celestial line art: astrolabe rings, tick dials, construction lines and constellations draw on with scroll; halftone moons on dashed orbits; twinkling stars with cross flares; quarter-res smoke | User reference (Spartan line art) + "as much pomp as you can". Draw-on keeps the raw to structured arc. One static frame under reduced motion; page works without WebGL. |
| 2026-11-03 | Spider-Verse print finish: RGB misregistration (scales with scroll speed), grain, vignette; halftone glitch bands; 3D tears in sync with the one-shot glitch | User request. Glitch pulse count unchanged (3). |
| 2026-11-03 | Name and role set in caps | User's subtitle reference. Uppercased in the text itself so measured glyphs match rendered ones. |
| 2026-11-03 | Canvas atlas holds both faces | Body stays in Instrument Sans for readability, so canvas glyphs match the DOM at handoff. |
