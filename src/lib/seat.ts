export const SEAT_KEY = "tc-seat-v1";
export type Seat = "guest" | "account";

export function readSeat(): Seat | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SEAT_KEY);
    if (raw === "guest" || raw === "account") return raw;
    return null;
  } catch {
    return null;
  }
}

export function writeSeat(seat: Seat) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEAT_KEY, seat);
  } catch {
    /* private mode */
  }
}

export function clearSeat() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SEAT_KEY);
  } catch {
    /* ignore */
  }
}

let introPlaying = false;
const introListeners = new Set<() => void>();

export function setIntroPlaying(playing: boolean) {
  introPlaying = playing;
  for (const fn of introListeners) fn();
}

export function isIntroPlaying() {
  return introPlaying;
}

export function subscribeIntroPlaying(fn: () => void) {
  introListeners.add(fn);
  return () => {
    introListeners.delete(fn);
  };
}
