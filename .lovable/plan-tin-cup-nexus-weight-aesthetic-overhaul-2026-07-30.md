# Tin Cup Nexus — Weight & Aesthetic Overhaul

Two tracks in one pass: strip the app down to what it actually loads, then retune the visual system so it stops reading as template-generated.

## Track 1 — Cut the weight

Confirmed dead or oversized in the current code:

- `three` (a ~600KB dependency) is only imported by `TrophyStage.tsx`, which is only imported by `Hero.tsx` — and `Hero` is no longer rendered anywhere since the cinematic intro replaced it. Delete `TrophyStage.tsx`, `Hero.tsx`, and uninstall `three`.
- `public/app-icon-512.png` is 806KB for a 512px PWA icon. Re-encode it far smaller and serve it as a CDN asset.
- `favicon.ico` is 64KB. Replace with a small ICO/SVG pair.
- `src/assets/trophy-fallback.jpg` (112KB) only existed as a fallback for the deleted 3D stage — remove it; the intro poster frame covers that role.
- Audit `recharts` the same way: if nothing renders a chart, it goes.

Also: preload the intro poster on `/` only (via that route's `head().links`), and keep the video lazy so first paint is the poster rather than a stalled canvas.

## Track 2 — Fix what makes it feel AI-designed

### Typography — one voice, not two

The Playfair Display + Plus Jakarta Sans pairing is the biggest tell. Drop Playfair entirely and run **one** typeface across the app, differentiated by weight, size and tracking instead of by family. Direction: a modern grotesk with real character — tight display weights for headings, normal weight for data. This also makes the app finally speak the same language as the cinematic intro, which was built on the "one refined typeface" rule.

Concretely:

- Remove `--font-display`, keep a single family token, and delete the `h1, h2, h3` family override.
- Define a real type scale (display / title / body / label / micro) as utilities, replacing the one-off `text-[10px] tracking-[0.16em]` strings scattered across nine components.
- Retire the all-caps 10px gold micro-label. Right now every card, nav item, mode switch and stat uses it, which flattens hierarchy — keep it for one role only.

### Structure — fewer surfaces, clearer hierarchy

- Every section is currently the same `glass rounded-2xl` card, so nothing reads as primary. Introduce three deliberate levels: one hero surface (the live score), plain sectioned content separated by hairlines, and quiet inline rows. Most cards become dividers.
- The Pre / Live / Hall of Fame selector sits in its own glass tray directly above content while the bottom nav does the same job visually. Convert it to a lighter inline segmented control that reads as a filter, not a second nav.
- Tighten vertical rhythm to a consistent 4/8/16/24 scale; current values (`mt-2`, `mt-5`, `p-1.5`, `p-4`, `p-5`, `mb-5`) are ad hoc.
- `Shell` currently floats a lone key icon in an otherwise empty top bar. Replace it with a proper minimal top rail: small wordmark left, captain key right, sticky and translucent.

### Color & material — less gold, more restraint

- Gold is currently applied as gradient text, glow, border, tint and progress fill all at once. Reduce to: gold for the single most important number per screen, plus active nav state. Everything else becomes bone/ivory on charcoal.
- The `gold-text` gradient reads cheap at small sizes — restrict it to the live score numerals.
- Tone borders from `gold / 22%` down to a near-neutral hairline, and reduce glass blur/saturation so cards sit back instead of shimmering.
- Keep copper strictly as the opposing team's color so it carries meaning.

### Motion

- Standardize on one easing curve and two durations, with a single shared reduced-motion guard instead of per-component checks.
- Keep the press effect but soften `active:scale-95` to `0.97` — 0.95 reads bouncy on a luxury surface.

## Technical notes

- All token changes land in `src/styles.css` (`@theme inline` + `@utility`); no hardcoded colors get added to components.
- Font loading stays a `<link>` in `src/routes/__root.tsx` — one family, three weights, so network cost drops too.
- Files touched: `styles.css`, `__root.tsx`, `Shell.tsx`, `BottomNav.tsx`, `panels.tsx`, `index.tsx`, `schedule.tsx`, `rosters.tsx`, `purse.tsx`, `captain.tsx`, `Countdown.tsx`, `ScoreModal.tsx`, `PhotoVault.tsx`, `SnakePitDrawer.tsx`, `CinematicIntro.tsx`.
- Files deleted: `Hero.tsx`, `TrophyStage.tsx`, `trophy-fallback.jpg`.
- No database, auth, or scoring logic changes — presentation and asset weight only.
