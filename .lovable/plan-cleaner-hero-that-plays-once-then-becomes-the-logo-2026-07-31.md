# Cleaner hero that plays once, then becomes the logo

The film stops being a permanent background. It plays one full pass, then folds itself away and the app takes over — with the wordmark shrinking into the header as the only thing left behind.

## 1. During the film

Nothing on screen but the film. It emerges from black as it does today, but the layer stack gets simplified: one vignette, one bottom gradient, light grain. The gold bloom, the scroll hint, the dates line and the buy-in button all come off the hero.

Near the end of the pass, "Tin Cup Invitational" fades up centered over the film in a single restrained weight. That mark is the only text in the intro.

## 2. The hand-off

When the video finishes its first play (or after a fixed ~7s ceiling if it can't load), the intro auto-collapses:

- The film dims to black and scales down slightly.
- The centered wordmark travels up and shrinks into the header's logo slot, landing exactly on the small Tin Cup mark in the top bar.
- The app content rises into place underneath.

The whole transition runs about 900ms on one easing curve. Once it completes, the intro section unmounts entirely — no fixed video layer left behind, no parallax, no scroll math. Scrolling the app is then as light as any other route.

A tap anywhere during the film skips straight to the collapse.

## 3. After the hand-off

The header gets the uploaded Tin Cup logo in place of the current text wordmark, sitting left with "Innisbrook 2026" beneath it and the captain key on the right. That logo is the landing target for the collapse animation.

The buy-in button moves into the app's Pre-Tournament panel as a primary action, so it isn't lost when the hero goes away.

## 4. Repeat visits

The intro plays once per browser session. After it has run, returning to the home route goes straight to the app with the logo already in the header — no film, no delay.

Reduced-motion visitors skip the film entirely and land on the app.

## Technical notes

- `src/components/tin-cup/CinematicIntro.tsx`: rewrite as a fixed-overlay, self-dismissing component instead of a `130svh` scroll section. State machine: `playing -> collapsing -> done`. `ended` event on the video (plus a timeout fallback and a pointerdown skip) triggers collapse; on collapse end the component returns `null` and sets `sessionStorage["tc-intro"] = "1"`. Video loses `loop`. Remove the rAF scroll loop, parallax vars, bloom layer, dim layer, hint, dates and CTA.
- FLIP-style landing: measure the header logo with `getBoundingClientRect()` and animate the centered wordmark to that rect with a single `transform` + `opacity` transition.
- `src/routes/index.tsx`: render the intro as an overlay sibling, drop the `rounded-t` / negative-shadow riser wrapper, and unlock body scroll once the intro is done.
- `src/components/tin-cup/Shell.tsx`: swap the text wordmark for the uploaded logo image with a stable `id`/ref so the intro can target it.
- `src/components/tin-cup/BottomNav.tsx`: remove the scroll-depth reveal — nav is visible as soon as the intro is gone.
- `src/components/tin-cup/panels.tsx`: add the Pay $150 buy-in action to the Pre-Tournament panel.
- `src/styles.css`: drop `--intro-*` custom-property defaults and the parallax/bloom utilities; keep `intro-emerge` and `intro-grain`.
- Logo asset: uploaded file goes through `lovable-assets` and is referenced by pointer JSON. No backend or data changes.
