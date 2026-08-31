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

function shortPot(label: string): string {
  return label
    .replace(/^CTP - /i, "CTP ")
    .replace(/^Long Drive - /i, "LD ")
    .replace(/^Long Drive /i, "LD ");
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

async function loadBadge(): Promise<HTMLImageElement | null> {
  if (typeof Image === "undefined") return null;
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = "/tin-cup-medal.png";
    await image.decode();
    return image;
  } catch {
    return null;
  }
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

async function renderCupStory(payload: CupStoryPayload): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  await waitForFonts();
  const badge = await loadBadge();

  const field = ctx.createLinearGradient(0, 0, 0, STORY_HEIGHT);
  field.addColorStop(0, "#16382e");
  field.addColorStop(0.45, "#0d241d");
  field.addColorStop(1, "#071410");
  ctx.fillStyle = field;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  ctx.strokeStyle = "#c7a85d";
  ctx.lineWidth = 4;
  ctx.strokeRect(48, 72, STORY_WIDTH - 96, STORY_HEIGHT - 168);
  ctx.strokeStyle = "rgba(199,168,93,.28)";
  ctx.lineWidth = 2;
  ctx.strokeRect(68, 92, STORY_WIDTH - 136, STORY_HEIGHT - 208);

  const cx = STORY_WIDTH / 2;
  if (badge) {
    const size = 300;
    ctx.drawImage(badge, cx - size / 2, 130, size, size);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#d9c27e";
  ctx.font = "600 26px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("4TH ANNUAL", cx, badge ? 470 : 220);
  ctx.fillStyle = "#f4f0e6";
  ctx.font = "700 54px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("TIN CUP INVITATIONAL", cx, badge ? 534 : 284);
  ctx.fillStyle = "rgba(244,240,230,.62)";
  ctx.font = "500 24px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("INNISBROOK · AUGUST 28–30", cx, badge ? 578 : 328);

  const panelY = badge ? 620 : 380;
  ctx.fillStyle = "#f4f0e6";
  roundRect(ctx, 120, panelY, STORY_WIDTH - 240, 340, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(16,46,37,.16)";
  ctx.lineWidth = 2;
  roundRect(ctx, 120, panelY, STORY_WIDTH - 240, 340, 18);
  ctx.stroke();

  ctx.fillStyle = "#3d5a3a";
  ctx.font = "700 22px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("STRONG MENTAL", 330, panelY + 70);
  ctx.fillStyle = "#8a6840";
  ctx.fillText("GRASS ROOTS", 750, panelY + 70);

  ctx.fillStyle = "#16382e";
  ctx.font = "700 120px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(formatCupPoints(payload.strongMental), 330, panelY + 200);
  ctx.fillStyle = "#8a6840";
  ctx.fillText(formatCupPoints(payload.grassRoots), 750, panelY + 200);
  ctx.fillStyle = "rgba(16,46,37,.35)";
  ctx.font = "600 48px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("–", cx, panelY + 186);

  ctx.fillStyle = "#5c4a28";
  ctx.font = "600 26px 'Plus Jakarta Sans', sans-serif";
  const status = payload.winnerName
    ? `${payload.winnerName.replace(/^Team /i, "")} wins the Cup`
    : payload.remaining > 0
      ? `${formatCupPoints(payload.remaining)} pts still on the course`
      : "All square · playoff if tied at 13";
  ctx.fillText(status.toUpperCase(), cx, panelY + 280);

  let y = panelY + 390;
  ctx.textAlign = "left";
  ctx.fillStyle = "#d9c27e";
  ctx.font = "600 22px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("THE CARD", 140, y);
  y += 18;
  for (const day of payload.days) {
    y += 78;
    ctx.fillStyle = "rgba(244,240,230,.06)";
    roundRect(ctx, 120, y - 52, STORY_WIDTH - 240, 70, 12);
    ctx.fill();
    ctx.fillStyle = "#f4f0e6";
    ctx.font = "700 28px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(day.label, 150, y - 8);
    ctx.fillStyle = "rgba(244,240,230,.55)";
    ctx.font = "500 20px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(day.format, 150, y + 18);
    ctx.textAlign = "right";
    ctx.fillStyle = "#f4f0e6";
    ctx.font = "700 32px 'Plus Jakarta Sans', sans-serif";
    const dayScore =
      day.remaining > 0
        ? `${formatCupPoints(day.strongMental)} – ${formatCupPoints(day.grassRoots)} · ${formatCupPoints(day.remaining)} out`
        : `${formatCupPoints(day.strongMental)} – ${formatCupPoints(day.grassRoots)}`;
    ctx.fillText(dayScore, STORY_WIDTH - 150, y + 4);
    ctx.textAlign = "left";
  }

  y += 64;
  ctx.fillStyle = "#d9c27e";
  ctx.font = "600 22px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("TROPHIES", 140, y);
  const awarded = payload.trophies.filter((trophy) => trophy.winner);
  if (awarded.length === 0) {
    y += 48;
    ctx.fillStyle = "rgba(244,240,230,.7)";
    ctx.font = "500 26px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("Championship · Chubbs MVP · Stinson Vibes · Snake Pit", 150, y);
    y += 36;
    ctx.fillStyle = "rgba(244,240,230,.42)";
    ctx.font = "500 22px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("Winners post after the last putt", 150, y);
  } else {
    y += 8;
    for (const trophy of payload.trophies) {
      y += 50;
      ctx.fillStyle = "#f4f0e6";
      ctx.font = "600 26px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(shortTrophy(trophy.name), 150, y);
      ctx.textAlign = "right";
      ctx.fillStyle = trophy.winner ? "#d9c27e" : "rgba(244,240,230,.4)";
      ctx.font = "600 24px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(trophy.winner ? firstName(trophy.winner) : "TBD", STORY_WIDTH - 150, y);
      ctx.textAlign = "left";
    }
  }

  if (payload.sideCash.length > 0) {
    y += 58;
    ctx.fillStyle = "#d9c27e";
    ctx.font = "600 22px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("SIDE CASH", 140, y);
    y += 8;
    const pots = payload.sideCash.slice(0, 6);
    for (let i = 0; i < pots.length; i += 2) {
      y += 44;
      const left = pots[i]!;
      const right = pots[i + 1];
      ctx.fillStyle = "rgba(244,240,230,.78)";
      ctx.font = "500 22px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(`${shortPot(left.label)} · ${firstName(left.player)}`, 150, y);
      if (right) {
        ctx.textAlign = "right";
        ctx.fillText(`${shortPot(right.label)} · ${firstName(right.player)}`, STORY_WIDTH - 150, y);
        ctx.textAlign = "left";
      }
    }
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#f4f0e6";
  ctx.font = "600 28px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("tincupinv.com", cx, STORY_HEIGHT - 118);
  ctx.fillStyle = "rgba(244,240,230,.5)";
  ctx.font = "500 20px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(`${EVENT.dates.toUpperCase()} · ${EVENT.totalPoints} POINT CUP`, cx, STORY_HEIGHT - 82);

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
