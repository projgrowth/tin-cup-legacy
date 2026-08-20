export type ShareMomentKind =
  "score" | "player" | "team" | "weekend" | "final" | "match" | "side-bet" | "trophy";

export type ShareMomentPayload = {
  kind: ShareMomentKind;
  eyebrow: string;
  title: string;
  primary: string;
  secondary?: string;
  canonicalUrl: string;
};

export type ShareMomentResult = "shared" | "downloaded" | "copied" | "failed";

const WIDTH = 1080;
const HEIGHT = 1350;

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

async function renderMoment(payload: ShareMomentPayload): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#102e25");
  gradient.addColorStop(0.62, "#071914");
  gradient.addColorStop(1, "#030b09");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = "#c7a85d";
  ctx.lineWidth = 3;
  ctx.strokeRect(44, 44, WIDTH - 88, HEIGHT - 88);
  ctx.strokeStyle = "rgba(199,168,93,.22)";
  ctx.strokeRect(64, 64, WIDTH - 128, HEIGHT - 128);

  ctx.textAlign = "center";
  ctx.fillStyle = "#d9c27e";
  ctx.font = "600 28px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText(payload.eyebrow.toUpperCase(), WIDTH / 2, 170);
  ctx.fillStyle = "#f4f0e6";
  ctx.font = "600 72px 'Plus Jakarta Sans', sans-serif";
  wrap(ctx, payload.title, WIDTH / 2, 310, 830, 84);

  ctx.fillStyle = "#d9c27e";
  ctx.font = "700 160px 'Plus Jakarta Sans', sans-serif";
  wrap(ctx, payload.primary, WIDTH / 2, 690, 880, 168);
  if (payload.secondary) {
    ctx.fillStyle = "rgba(244,240,230,.76)";
    ctx.font = "500 34px 'Plus Jakarta Sans', sans-serif";
    wrap(ctx, payload.secondary, WIDTH / 2, 940, 820, 48);
  }

  ctx.fillStyle = "#f4f0e6";
  ctx.font = "600 42px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("TIN CUP INVITATIONAL", WIDTH / 2, 1170);
  ctx.fillStyle = "rgba(244,240,230,.58)";
  ctx.font = "500 24px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("AUGUST 28–30 · INNISBROOK", WIDTH / 2, 1220);

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image export failed"))),
      "image/png",
    ),
  );
}

export async function shareMoment(payload: ShareMomentPayload): Promise<ShareMomentResult> {
  if (typeof document === "undefined") return "failed";
  try {
    const blob = await renderMoment(payload);
    const file = new File([blob], `tin-cup-${payload.kind}.png`, { type: "image/png" });
    const text = `${payload.title}\n${payload.primary}${payload.secondary ? ` · ${payload.secondary}` : ""}`;
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: "Tin Cup Invitational",
        text,
        url: payload.canonicalUrl,
        files: [file],
      });
      return "shared";
    }

    try {
      await navigator.clipboard?.writeText(`${text}\n${payload.canonicalUrl}`);
    } catch {
      // The downloaded image remains a complete fallback when clipboard access is denied.
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
