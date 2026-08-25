/** Guest-only locker-room mask. Signed-in players see the raw line. */

const GUEST_MASK =
  /\b(fuck(?:ing|er|ed)?|shit(?:ty|ting)?|asshole|bitch|cunt|dick|cock|piss(?:ed)?|goddamn)\b/gi;

export function maskGuestProfanity(body: string, signedIn: boolean): string {
  const text = body.trim();
  if (!text || signedIn) return text;
  const masked = text.replace(GUEST_MASK, "—");
  return masked.replace(/\s{2,}/g, " ").trim();
}

export function isJunkCaption(value: string | null | undefined): boolean {
  const text = (value ?? "").trim().toLowerCase();
  if (!text) return false;
  return (
    text === "test" ||
    text === "caption test" ||
    text === "captiontest" ||
    /^caption\s*test/.test(text)
  );
}

export function isJunkBody(body?: string | null): boolean {
  const text = (body ?? "").trim();
  if (!text) return true;
  return isJunkCaption(text);
}

export const TALK_MAX = 140;
