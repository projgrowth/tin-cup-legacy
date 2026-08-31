import { roundTally, tallyStandings } from "@/lib/scoring";
import { EVENT } from "@/lib/tin-cup";

export type ShareMomentKind =
  | "score"
  | "player"
  | "team"
  | "weekend"
  | "final"
  | "match"
  | "side-bet"
  | "trophy"
  | "cup-story";

export type ShareCaptionPayload = {
  kind: Exclude<ShareMomentKind, "cup-story">;
  eyebrow: string;
  title: string;
  primary: string;
  secondary?: string;
  canonicalUrl: string;
};

export type CupStoryDay = {
  label: string;
  format: string;
  strongMental: number;
  grassRoots: number;
  remaining: number;
};

export type CupStoryPayload = {
  kind: "cup-story";
  winnerName: string | null;
  strongMental: number;
  grassRoots: number;
  remaining: number;
  days: CupStoryDay[];
  trophies: Array<{ name: string; winner: string | null }>;
  sideCash: Array<{ label: string; player: string }>;
  canonicalUrl: string;
  includePhoto?: boolean;
};

export type ShareMomentPayload = ShareCaptionPayload | CupStoryPayload;

export type ShareMomentResult = "shared" | "downloaded" | "copied" | "failed";

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const MOMENT_WIDTH = 1080;
const MOMENT_HEIGHT = 1350;

export function formatCupPoints(value: number): string {
  const rounded = Math.round(value * 2) / 2;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function firstName(value: string): string {
  return value.trim().split(/\s+/)[0] ?? value;
}

function shortTrophy(name: string): string {
  return name
    .replace(/^The /i, "")
    .replace("Steve Stinson Vibes Award", "Stinson Vibes")
    .replace("Chubbs Peterson MVP", "Chubbs MVP");
}

function dayFormat(format: string | null | undefined, slug: string): string {
  if (slug === "friday") return "Scramble · Alt Shot";
  if (slug === "saturday") return "Stableford";
  if (slug === "sunday") return "Shamble · Singles";
  return (format ?? "").replace(/Match Play/i, "").trim() || slug;
}

export function buildCupStoryPayload(input: {
  matches: Array<{ round_id: string; points: number | string; result: string }>;
  rounds: Array<{
    id: string;
    slug: string;
    day_label: string;
    format: string | null;
    sort_order: number;
  }>;
  teams: Array<{ slug: string; name: string }>;
  trophies: Array<{ name: string; winner_name: string | null; sort_order: number }>;
  sideBets: Array<{ label: string; player_name: string | null; sort_order: number }>;
  canonicalUrl: string;
}): CupStoryPayload {
  const scored = input.matches.map((match, index) => ({
    id: `share-${index}`,
    ...match,
  }));
  const standings = tallyStandings(scored);
  const winnerSlug =
    standings.remaining === 0
      ? standings.strongMental > standings.grassRoots
        ? "strong-mental"
        : standings.grassRoots > standings.strongMental
          ? "grass-roots"
          : null
      : null;
  const winnerName = winnerSlug
    ? (input.teams.find((team) => team.slug === winnerSlug)?.name ?? null)
    : null;
  const days = [...input.rounds]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((round) => {
      const tally = roundTally(scored, round.id);
      return {
        label: round.day_label,
        format: dayFormat(round.format, round.slug),
        strongMental: tally.strongMental,
        grassRoots: tally.grassRoots,
        remaining: tally.remaining,
      };
    });
  return {
    kind: "cup-story",
    winnerName,
    strongMental: standings.strongMental,
    grassRoots: standings.grassRoots,
    remaining: standings.remaining,
    days,
    trophies: [...input.trophies]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((trophy) => ({ name: trophy.name, winner: trophy.winner_name })),
    sideCash: [...input.sideBets]
      .filter((bet) => Boolean(bet.player_name?.trim()))
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((bet) => ({ label: bet.label, player: bet.player_name!.trim() })),
    canonicalUrl: input.canonicalUrl,
  };
}

export function cupStoryCaption(payload: CupStoryPayload): string {
  const score = `Strong Mental ${formatCupPoints(payload.strongMental)} – Grass Roots ${formatCupPoints(payload.grassRoots)}`;
  const status = payload.winnerName
    ? `${payload.winnerName} wins the Cup`
    : payload.remaining > 0
      ? `${formatCupPoints(payload.remaining)} pts still on the course`
      : "All square";
  return `4th Annual Tin Cup Invitational\n${score}\n${status}\n${payload.canonicalUrl}`;
}

export function groupSideCashByPlayer(
  pots: Array<{ player: string }>,
): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const pot of pots) {
    const name = firstName(pot.player);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export type StoryBand = { id: string; top: number; height: number };

const STORY_SAFE_TOP = 250;
const STORY_SAFE_BOTTOM = 1700;

/** Non-overlapping vertical bands. Instagram UI sits outside these. Medal may overlay the photo seam. */
export function layoutCupStory(payload: CupStoryPayload): StoryBand[] {
  const awarded = payload.trophies.filter((trophy) => trophy.winner);
  const cash = groupSideCashByPlayer(payload.sideCash);
  const withPhoto = Boolean(payload.includePhoto);
  let y = withPhoto ? 176 : STORY_SAFE_TOP;
  const bands: StoryBand[] = [];
  const push = (id: string, height: number, gap = 32) => {
    bands.push({ id, top: y, height });
    y += height + gap;
  };
  if (withPhoto) {
    // 1080×424 matches tin-cup-field-2026.jpg (2400×941) so the line is not cropped.
    push("photo", 424, 64);
  } else {
    push("medal", 156, 16);
    push("title", 88, 28);
  }
  push("score", 336, awarded.length || cash.length ? 36 : 24);
  if (awarded.length) push("awards", 28 + awarded.length * 48, cash.length ? 28 : 16);
  if (cash.length) push("cash", 68, 0);
  const last = bands[bands.length - 1];
  if (last && last.top + last.height > STORY_SAFE_BOTTOM) {
    return bands.filter((band) => band.id !== "cash");
  }
  return bands;
}

/** Crest sits on the photo/score seam (or in the medal band when there is no photo). */
export function storyMedalPlacement(bands: StoryBand[]): { top: number; size: number } | null {
  const photo = bands.find((row) => row.id === "photo");
  const medal = bands.find((row) => row.id === "medal");
  if (photo) {
    const size = 184;
    return { top: photo.top + photo.height - Math.round(size * 0.48), size };
  }
  if (medal) return { top: medal.top, size: medal.height };
  return null;
}

function dayAbbrev(label: string): string {
  return label.trim().slice(0, 3).toUpperCase();
}

function wrap(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  max: number,
  step: number,
) {
  const words = value.split(/\s+/);
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += step;
    } else line = next;
  }
  if (line) ctx.fillText(line, x, y);
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (typeof Image === "undefined") return null;
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    await image.decode();
    return image;
  } catch {
    return null;
  }
}

async function loadBadge(): Promise<HTMLImageElement | null> {
  return loadImage("/tin-cup-medal.png");
}

async function loadFieldPhoto(): Promise<HTMLImageElement | null> {
  return loadImage("/tin-cup-field-2026.jpg");
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const imageRatio = image.width / image.height;
  const boxRatio = w / h;
  let sx = 0;
  let sy = 0;
  let sw = image.width;
  let sh = image.height;
  if (imageRatio > boxRatio) {
    sw = image.height * boxRatio;
    sx = (image.width - sw) / 2;
  } else {
    sh = image.width / boxRatio;
    sy = (image.height - sh) / 2;
  }
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
}

async function waitForFonts() {
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => window.setTimeout(resolve, 400)),
    ]);
  } catch {
    /* canvas falls back to system sans */
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

async function renderMoment(payload: ShareCaptionPayload): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = MOMENT_WIDTH;
  canvas.height = MOMENT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  await waitForFonts();

  const gradient = ctx.createLinearGradient(0, 0, MOMENT_WIDTH, MOMENT_HEIGHT);
  gradient.addColorStop(0, "#102e25");
  gradient.addColorStop(0.62, "#071914");
  gradient.addColorStop(1, "#030b09");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, MOMENT_WIDTH, MOMENT_HEIGHT);
  ctx.strokeStyle = "#c7a85d";
  ctx.lineWidth = 3;
  ctx.strokeRect(44, 44, MOMENT_WIDTH - 88, MOMENT_HEIGHT - 88);
  ctx.strokeStyle = "rgba(199,168,93,.22)";
  ctx.strokeRect(64, 64, MOMENT_WIDTH - 128, MOMENT_HEIGHT - 128);

  ctx.textAlign = "center";
  ctx.fillStyle = "#d9c27e";
  ctx.font = "600 28px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(payload.eyebrow.toUpperCase(), MOMENT_WIDTH / 2, 170);
  ctx.fillStyle = "#f4f0e6";
  ctx.font = "600 72px 'Plus Jakarta Sans', sans-serif";
  wrap(ctx, payload.title, MOMENT_WIDTH / 2, 310, 830, 84);

  ctx.fillStyle = "#d9c27e";
  ctx.font = "700 160px 'Plus Jakarta Sans', sans-serif";
  wrap(ctx, payload.primary, MOMENT_WIDTH / 2, 690, 880, 168);
  if (payload.secondary) {
    ctx.fillStyle = "rgba(244,240,230,.76)";
    ctx.font = "500 34px 'Plus Jakarta Sans', sans-serif";
    wrap(ctx, payload.secondary, MOMENT_WIDTH / 2, 940, 820, 48);
  }

  ctx.fillStyle = "#f4f0e6";
  ctx.font = "600 42px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("TIN CUP INVITATIONAL", MOMENT_WIDTH / 2, 1170);
  ctx.fillStyle = "rgba(244,240,230,.58)";
  ctx.font = "500 24px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("AUGUST 28–30 · INNISBROOK", MOMENT_WIDTH / 2, 1220);

  return await blobFrom(canvas);
}

function fitText(ctx: CanvasRenderingContext2D, value: string, max: number): string {
  if (ctx.measureText(value).width <= max) return value;
  let text = value;
  while (text.length > 1 && ctx.measureText(`${text}…`).width > max) {
    text = text.slice(0, -1);
  }
  return `${text}…`;
}

function band(bands: StoryBand[], id: string): StoryBand | undefined {
  return bands.find((row) => row.id === id);
}

async function renderCupStory(payload: CupStoryPayload): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  await waitForFonts();
  const badge = await loadBadge();
  const fieldPhoto = payload.includePhoto ? await loadFieldPhoto() : null;
  const bands = layoutCupStory(payload);
  const awarded = payload.trophies.filter((trophy) => trophy.winner);
  const cash = groupSideCashByPlayer(payload.sideCash);
  const cx = STORY_WIDTH / 2;
  const inset = 112;
  const gold = "#c4a35a";
  const ivory = "#f3eee4";
  const hunter = "#16382e";
  const stone = "#8b6a3e";

  const field = ctx.createLinearGradient(0, 0, 0, STORY_HEIGHT);
  field.addColorStop(0, "#1a3d32");
  field.addColorStop(1, "#0a1c16");
  ctx.fillStyle = field;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  const photo = band(bands, "photo");
  if (fieldPhoto && photo) {
    drawCover(ctx, fieldPhoto, 0, photo.top, STORY_WIDTH, photo.height);
    const fade = ctx.createLinearGradient(
      0,
      photo.top + photo.height - 80,
      0,
      photo.top + photo.height,
    );
    fade.addColorStop(0, "rgba(10,28,22,0)");
    fade.addColorStop(1, "#0a1c16");
    ctx.fillStyle = fade;
    ctx.fillRect(0, photo.top + photo.height - 80, STORY_WIDTH, 80);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.7)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = ivory;
    ctx.font = "600 18px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("4TH ANNUAL  ·  INNISBROOK 2026", 48, photo.top + 42);
    ctx.restore();
  } else {
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(56, 96, STORY_WIDTH - 112, STORY_HEIGHT - 220);
  }

  const title = band(bands, "title");
  if (title) {
    ctx.textAlign = "center";
    ctx.fillStyle = gold;
    ctx.font = "600 20px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("4TH ANNUAL", cx, title.top + 28);
    ctx.fillStyle = ivory;
    ctx.font = "700 44px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("TIN CUP", cx, title.top + 76);
    ctx.fillStyle = "rgba(243,238,228,.55)";
    ctx.font = "500 20px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("INNISBROOK  ·  2026", cx, title.top + 104);
  }

  const score = band(bands, "score");
  if (score) {
    const plateX = inset;
    const plateW = STORY_WIDTH - inset * 2;
    ctx.fillStyle = ivory;
    roundRect(ctx, plateX, score.top, plateW, score.height, 20);
    ctx.fill();
    ctx.strokeStyle = "rgba(196,163,90,.5)";
    ctx.lineWidth = 2;
    roundRect(ctx, plateX + 1, score.top + 1, plateW - 2, score.height - 2, 18);
    ctx.stroke();

    const left = plateX + plateW * 0.25;
    const right = plateX + plateW * 0.75;
    ctx.textAlign = "center";
    ctx.fillStyle = hunter;
    ctx.font = "700 17px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("STRONG MENTAL", left, score.top + 42);
    ctx.fillStyle = stone;
    ctx.fillText("GRASS ROOTS", right, score.top + 42);
    ctx.fillStyle = hunter;
    ctx.font = "700 92px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(formatCupPoints(payload.strongMental), left, score.top + 138);
    ctx.fillStyle = stone;
    ctx.fillText(formatCupPoints(payload.grassRoots), right, score.top + 138);
    ctx.fillStyle = "rgba(22,56,46,.28)";
    ctx.font = "600 36px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("–", cx, score.top + 126);
    ctx.fillStyle = stone;
    ctx.font = "600 20px 'Plus Jakarta Sans', sans-serif";
    const status = payload.winnerName
      ? `${payload.winnerName.replace(/^Team /i, "")} wins the Cup`
      : payload.remaining > 0
        ? `${formatCupPoints(payload.remaining)} pts still out`
        : "All square";
    ctx.fillText(fitText(ctx, status, plateW - 48), cx, score.top + 180);

    const days = payload.days.slice(0, 3);
    if (days.length) {
      const cellY = score.top + 208;
      const cellH = score.height - 230;
      const gap = 12;
      const pad = 20;
      const cellW = (plateW - pad * 2 - gap * (days.length - 1)) / days.length;
      days.forEach((day, index) => {
        const cellX = plateX + pad + index * (cellW + gap);
        ctx.fillStyle = "rgba(22,56,46,.06)";
        roundRect(ctx, cellX, cellY, cellW, cellH, 12);
        ctx.fill();
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(22,56,46,.48)";
        ctx.font = "700 13px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText(dayAbbrev(day.label), cellX + cellW / 2, cellY + 26);
        ctx.fillStyle = hunter;
        ctx.font = "700 26px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText(
          `${formatCupPoints(day.strongMental)}–${formatCupPoints(day.grassRoots)}`,
          cellX + cellW / 2,
          cellY + 60,
        );
        ctx.fillStyle = "rgba(22,56,46,.5)";
        ctx.font = "500 12px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText(
          fitText(ctx, day.format.replace(" · ", " / "), cellW - 16),
          cellX + cellW / 2,
          cellY + 84,
        );
      });
    }
  }

  const crest = storyMedalPlacement(bands);
  if (badge && crest) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.45)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 8;
    ctx.drawImage(badge, cx - crest.size / 2, crest.top, crest.size, crest.size);
    ctx.restore();
  }

  const awards = band(bands, "awards");
  if (awards && awarded.length) {
    ctx.textAlign = "left";
    ctx.fillStyle = gold;
    ctx.font = "600 16px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("AWARDS", inset, awards.top + 18);
    awarded.forEach((trophy, index) => {
      const row = awards.top + 48 + index * 50;
      ctx.fillStyle = ivory;
      ctx.font = "500 24px 'Plus Jakarta Sans', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(fitText(ctx, shortTrophy(trophy.name), 520), inset, row);
      ctx.textAlign = "right";
      ctx.fillStyle = gold;
      ctx.font = "600 24px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(firstName(trophy.winner ?? ""), STORY_WIDTH - inset, row);
    });
  }

  const cashBand = band(bands, "cash");
  if (cashBand && cash.length) {
    ctx.textAlign = "left";
    ctx.fillStyle = gold;
    ctx.font = "600 16px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("SIDE CASH", inset, cashBand.top + 18);
    ctx.fillStyle = "rgba(243,238,228,.82)";
    ctx.font = "500 24px 'Plus Jakarta Sans', sans-serif";
    const line = cash
      .map((row) => (row.count > 1 ? `${row.name} ${row.count}` : row.name))
      .join("   ·   ");
    ctx.fillText(fitText(ctx, line, STORY_WIDTH - inset * 2), inset, cashBand.top + 56);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = ivory;
  ctx.font = "600 22px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("tincupinv.com", cx, 1768);
  ctx.fillStyle = "rgba(243,238,228,.45)";
  ctx.font = "500 16px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(`${EVENT.totalPoints} POINT CUP`, cx, 1800);

  return await blobFrom(canvas);
}

function blobFrom(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image export failed"))),
      "image/png",
    ),
  );
}

export async function shareMoment(payload: ShareMomentPayload): Promise<ShareMomentResult> {
  if (typeof document === "undefined") return "failed";
  try {
    const blob =
      payload.kind === "cup-story" ? await renderCupStory(payload) : await renderMoment(payload);
    const file = new File([blob], `tin-cup-${payload.kind}.png`, { type: "image/png" });
    const text =
      payload.kind === "cup-story"
        ? cupStoryCaption(payload)
        : `${payload.title}\n${payload.primary}${payload.secondary ? ` · ${payload.secondary}` : ""}`;
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: "Tin Cup Invitational",
        text,
        url: payload.kind === "cup-story" ? payload.canonicalUrl : payload.canonicalUrl,
        files: [file],
      });
      return "shared";
    }

    try {
      await navigator.clipboard?.writeText(
        payload.kind === "cup-story" ? text : `${text}\n${payload.canonicalUrl}`,
      );
    } catch {
      /* downloaded image remains the fallback */
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "downloaded";
  } catch {
    return "failed";
  }
}
