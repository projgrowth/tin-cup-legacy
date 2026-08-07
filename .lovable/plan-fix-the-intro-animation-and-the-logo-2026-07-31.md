# Fix the intro animation and the logo

Two things are making it read cheap, and both are fixable without touching data or scoring.

## What's actually wrong

**The logo.** The crest file is a full lockup — badge, golfer, and the words "THE TIN CUP INVITATIONAL" baked in — sitting inside a large black square with roughly 20% dead padding on every side. In the header it renders at 28px, so the baked-in type collapses into gold mush and the padding shrinks the visible badge to about 20px. Next to it the header repeats "Tin Cup / INVITATIONAL" in live text, so the same words appear twice. `mix-blend-screen` is also applied, which on a photographic JPEG dulls the gold rather than cleaning it up.

**The animation.** The intro ends by flying that same detailed photographic lockup across the screen and scaling it down about 4x into the tiny header slot. Scaling a raster crest that hard mid-flight is what looks amateur — edges shimmer and the type turns to noise on the way down. On top of that the film currently fills the frame with no readable vignette or gradient falloff, so it looks like a raw video clip instead of a title sequence.

## The fix

### Logo

- Crop the crest to the badge bounds and re-upload it as a tight asset, so the same pixel box shows a meaningfully larger mark.
- Header becomes crest-only at a larger size (~34px), with no duplicate wordmark — the badge already says it. "Innisbrook 2026" stays as the single supporting line and the divider tightens around it.
- Remove `mix-blend-screen`; the crest already sits on black.
- Bump the intro crest to a size where the baked-in type is legible, and put a soft gold falloff behind it instead of relying on the raw video for contrast.

### Animation

Replace the fly-and-shrink with a restrained title-card hand-off:

1. Film emerges from black as it does now, but with a real vignette and a stronger bottom gradient so it reads as a framed shot, not a clip.
2. Crest fades up centered, held large and still. No travel, no scale.
3. On hand-off, the film dims to black behind the crest first, then the crest cross-dissolves in place while the app fades in underneath. Nothing scales, nothing flies — the header crest is simply already there when the veil lifts.
4. Total hand-off around 700ms on one easing curve, with the crest holding a beat longer than the film so the eye keeps an anchor through the cut.

Tap-to-skip still jumps straight to the hand-off. Reduced motion and repeat visits in the same session still bypass the film entirely.

## Technical notes

- `src/assets/`: new cropped crest asset via `lovable-assets` (tight bounds, PNG with transparency so it composites cleanly at any size); old pointer removed once nothing references it.
- `src/components/tin-cup/CinematicIntro.tsx`: delete the FLIP measurement (`getBoundingClientRect` against `HEADER_MARK_ID`), the `markStyle` state, and the transform-based collapse. Collapse becomes two staged opacity transitions — film layer first, crest second. Strengthen the vignette and bottom-gradient stops. `HEADER_MARK_ID` is no longer needed as an animation target.
- `src/components/tin-cup/Shell.tsx`: crest-only header lockup at 34px; drop the duplicated "Tin Cup / Invitational" spans and `mix-blend-screen`; keep the profile/captain key on the right.
- No route, data, backend, or scoring changes.
