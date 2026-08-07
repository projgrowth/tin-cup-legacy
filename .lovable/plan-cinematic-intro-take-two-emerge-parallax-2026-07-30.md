# Cinematic Intro, Take Two — Emerge + Parallax

Replace the current intro treatment (staggered logo/wordmark/CTA over the video) with a quieter, film-like reveal.

## 1. Emerge from black

On load, the screen is essentially black. Over roughly 1.8 seconds the video resolves in: opacity rises from 0 to 1 while a soft blur and a slight scale-up settle to normal. No text, no logo, no button — just the film.

If the visitor prefers reduced motion, the poster frame appears immediately at full opacity with no blur or scale.

## 2. Parallax on scroll

The video sits in a fixed layer behind the page and moves slower than the content — it drifts up at roughly 35% of scroll speed while the tournament board slides over it at full speed. As the board rises, the video gently darkens and desaturates so the transition reads as a hand-off rather than a cut.

The board keeps its rounded top edge and deep shadow so it looks like a physical panel lifting over the film.

## 3. Text only on scroll

Nothing overlays the video at first. Once scrolling starts (about 8% of a viewport), a single restrained block fades up over the film: the "Innisbrook · 2026" line, the Tin Cup Invitational wordmark, the dates, and the "Pay $150 Buy-In" button. It fades back out as the board covers it. A small "Scroll" hint appears after about 3 seconds of stillness if the visitor hasn't moved yet, and disappears on first scroll.

## 4. Everything else unchanged

Bottom nav stays hidden during the intro as it does today. The captain icon, segmented control, panels, and all other routes are untouched.

## Technical notes

- `src/components/tin-cup/CinematicIntro.tsx`: rewrite. Add a mount-driven `revealed` state that flips on after a frame to drive the opacity/blur/scale-in; keep the existing scroll `progress` rAF listener and add a `translate3d(0, -scrollY * 0.35, 0)` on the fixed video layer for parallax; gate the text block on `progress > 0.08` and drive its opacity from progress. Retain `useReducedMotion`, the vignette/gradient layers, grain, and mouse parallax (composed into the same transform as the scroll offset).
- `src/styles.css`: drop the now-unused `intro-in` / `intro-d1..d3` staggered utilities and add an `intro-emerge` keyframe (opacity 0 -> 1, `blur(18px)` -> 0, `scale(1.08)` -> `scale(1)`, ~1.8s). Keep `intro-film`, `intro-grain`, and the reduced-motion block.
- No changes to `src/routes/index.tsx`, `BottomNav.tsx`, backend, or data.
