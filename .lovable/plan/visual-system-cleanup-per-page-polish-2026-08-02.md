# Visual System Cleanup + Per-Page Polish

Goal: one coherent card/type/control language across every page, then targeted visual upgrades page by page. No data or scoring logic changes.

## Design system conflicts found in code

1. **Two competing card idioms.** `.glass` (blur + own background/border, _no radius_) and `.surface` (flat tint + `--radius`) are both used as "the card". Because `.glass` has no radius, every use pairs it with `rounded-2xl` (AuthCard, BottomNav, PhotoVault, captain, profile, scout, schedule, player). Corners therefore differ page to page — ~22px on glass cards, 14px on surface cards.
2. **Control radius has no rule.** `rounded-xl` for inputs/buttons, `rounded-full` for pills, `rounded-2xl` for cards, plus one-off `rounded-[var(--radius)]` rows. Nothing derives from the radius scale.
3. **Two button styles, no shared component.** Solid `bg-gold text-primary-foreground` and outline `border-gold/30 bg-gold/10 text-gold-light` are re-typed in roughly a dozen places with slightly different padding and font weight.
4. **Non-token colors.** `bg-white/8` progress tracks (panels.tsx, PhotoVault.tsx), `bg-black/92` lightbox, `bg-black` intro, and `theme-color: #080f0a` in `__root.tsx`, which no longer matches the actual `--background`.
5. **Type scale bypassed.** `__root.tsx` uses `text-7xl` / `text-xl`, SnakePitDrawer uses `text-lg`. Shadcn primitives (`button`, `input`, `select`, `dialog`) still ship `text-sm` / `rounded-md` defaults that ignore the `t-*` scale and the radius scale.
6. **Three section-heading roles for one job.** `t-eyebrow` on most pages, `t-section` on profile/scout, bare `t-title` on rosters — inconsistent section rhythm.
7. **No team identity tokens.** Strong Mental = gold, Grass Roots = copper is re-derived by hand in each component instead of a token plus one helper.
8. **No focus-visible treatment.** `.press` covers touch only; keyboard focus is invisible on the custom buttons.
9. **Bottom-nav overlap.** On purse, schedule, and scout the final block sits under the floating nav (the playoff note and the "Captain access" link are cut in a mobile capture). Shell bottom padding is short of the nav height.

## Phase 1 — Unify the system (styles.css + Shell)

- Give `.glass` its own `border-radius` and drop every paired `rounded-2xl`.
- Add `.control` (input/select), `.btn-gold`, `.btn-quiet`, and `.pill` utilities on the radius scale so buttons stop being retyped; add a shared `focus-visible` ring using `--ring` to `.press`.
- Add `--track` (progress track) and `--scrim` (overlay) tokens; replace `bg-white/8`, `bg-black/92`, `bg-black`.
- Sync `theme-color` to the real background value.
- Standardize section headings on `t-eyebrow`; retire `t-section` usage.
- Add `--team-a` / `--team-b` tokens and one `teamAccent(slug)` helper.
- Raise Shell bottom padding above the nav so no page clips.
- Retune the shadcn `button` and `input` variants to the radius scale and `t-body`.

## Phase 2 — Per-page visual improvements

**Home / Leaderboard** — after the intro the score bar is the only hero. Add a compact live round strip (Fri / Sat / Sun with points earned vs available) directly under it so the 26-point picture reads at a glance, and tighten section spacing for a denser board.

**Schedule** — three near-identical label/value tables. Convert each round to a header plus accent rail card: day, course chip, points as a large numeral, then tee window / format / breakdown as two-line rows instead of a full-width table. Color the rail by course (South / Copperhead / Island) and give the live or next round an active gold state instead of every card reading "upcoming".

**Rosters** — 16 visually identical rows. Add a per-team accent rail and real captain badge styling, show W-L-H as a small right-aligned numeral group (dash before any matches are played), and give the team header a points-vs-target bar so the page carries standings weight.

**Purse** — the full-width gold Pay button outweighs everything. Demote it to a sticky footer action or an outline button beside the side-cash board, promote the side-cash board to the hero surface, and split "Rules of the Cup" into two grouped cards (Format / Money) so the text wall scans.

**Scout** — the hole stepper clips at the viewport edge; add edge fades and snap scrolling, and mark the current hole with a filled numeral. Show par and yardage as a numeral pair above the map, move notes into a bottom sheet instead of an inline block, and give the signed-out state a course-art teaser rather than a bare form.

**Profile** — the signed-out state is one card on a mostly empty screen. Add a short value list (claim your spot, private notes, game plan) under the auth card, and group the signed-in state into cards on the unified surface.

**Captain / Admin** — move the ad-hoc glass + rounded-2xl forms onto the new `.control` / `.btn-gold` utilities and add a role badge (Captain / Admin / No access) so state is visible at a glance.

**Player profile** — add the team accent rail, make points earned the hero numeral, and render match history as a timeline instead of flat rows.

## Verification

Type check, run the vitest suite, and re-capture all seven routes at mobile width to confirm no clipping under the bottom nav and consistent corners, spacing, and section rhythm.
