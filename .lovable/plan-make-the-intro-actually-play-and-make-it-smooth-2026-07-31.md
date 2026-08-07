# Make the intro actually play, and make it smooth

Two separate problems: the film often never starts, and everything feels heavy while scrolling.

## 1. Why it doesn't play

The video file is 7.6 MB and is fetched with `preload="auto"`, so on a phone the first frames can take many seconds — the screen just sits on the poster. On top of that, if the browser refuses autoplay (low power mode, background tab, first paint before the element is ready) nothing retries.

Fixes:

- Ship a much lighter film: re-encode to a ~1.5-2.5 MB 720p H.264 MP4 plus a WebM variant, and add a tiny low-bitrate "instant" version that starts immediately while the full one buffers. Keep the existing poster as the first frame so there is never a black gap.
- Use `preload="metadata"` and start playback on the `canplay` event instead of hoping `autoplay` fires.
- Retry play on: first user tap/scroll, tab becoming visible again, and after a short delay. If playback is genuinely blocked, the poster stays up with the same bloom/parallax treatment so the intro still reads as intentional.

## 2. Why it feels laggy

Every scroll frame currently sets three pieces of React state, which re-renders the whole home page (intro, board, panels) 60 times a second. The fixed film layer also animates a `filter: saturate()/brightness()` and a continuous scale loop, both of which force the compositor to re-rasterise a full-screen video each frame.

Fixes:

- Drive scroll motion through CSS custom properties written straight to the DOM in a rAF loop — zero React re-renders while scrolling.
- Replace the animated `filter` hand-off with an overlay whose opacity changes (opacity is composited, filters are not).
- Drop the always-on 10s push-in zoom on the video; keep only the one-time emerge so the GPU is idle once the intro settles.
- Confine the reveal blur to the opening animation and remove `will-change` from layers that aren't moving, so the browser stops holding extra full-screen textures.
- Skip mouse parallax entirely on touch devices and throttle it to the same rAF loop.

## 3. Result

Film starts within a fraction of a second, emerges from black once, then drifts behind the board at a steady 60fps with no jank on scroll. Reduced-motion visitors get the still poster immediately, as today.

## Technical notes

- `src/components/tin-cup/CinematicIntro.tsx`: rewrite. Single rAF loop writes `--intro-y`, `--intro-dim`, `--intro-text` on a container ref; React state limited to `revealed`, `blocked`, and `hint`. Video gets `preload="metadata"`, `<source>` entries for WebM + MP4, and a `playFilm()` helper wired to `canplay`, `visibilitychange`, `pointerdown`, and `scroll`.
- New assets: re-encode the existing MP4 with ffmpeg (720p, CRF ~30, faststart) and a VP9 WebM, upload both via `lovable-assets`, delete the 7.6 MB pointer once nothing references it.
- `src/styles.css`: remove `intro-push` and `trophy-float`; keep `intro-emerge` (shortened to ~1.4s) and `intro-grain`; add the dim/parallax custom-property defaults.
- No changes to routes, data, or backend.
