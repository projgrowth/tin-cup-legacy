/** Unofficial live match status — never writes matches.result. */
export type HoleMark = "won" | "halved" | "lost";

export type LiveHoles = {
  kind: "match-play" | "stableford";
  marks?: HoleMark[];
  pointsA?: number;
  pointsB?: number;
};

export type LiveReport = {
  pairingKey: string;
  matchId: string | null;
  reporterId: string;
  playerId: string;
  playerName: string;
  status: string;
  holes: LiveHoles | null;
  updatedAt: string;
  unofficial: true;
};

export function isStablefordLabel(label: string | null | undefined): boolean {
  return /stableford/i.test(label ?? "");
}

export function summarizeMatchPlay(
  marks: HoleMark[],
  holesTotal = 18,
): { headline: string; detail: string; closed: boolean; dormie: boolean; up: number } {
  let up = 0;
  for (const mark of marks) {
    if (mark === "won") up += 1;
    else if (mark === "lost") up -= 1;
  }
  const through = marks.length;
  const remain = Math.max(0, holesTotal - through);
  const abs = Math.abs(up);
  if (through === 0) {
    return { headline: "AS", detail: "Not started", closed: false, dormie: false, up: 0 };
  }
  if (remain === 0) {
    if (up === 0) return { headline: "AS", detail: "Closed · 18", closed: true, dormie: false, up };
    return {
      headline: `${abs} up`,
      detail: "Closed",
      closed: true,
      dormie: false,
      up,
    };
  }
  if (abs > remain) {
    return {
      headline: `${abs} & ${remain}`,
      detail: "Closed",
      closed: true,
      dormie: false,
      up,
    };
  }
  if (abs === remain) {
    if (up === 0) {
      return { headline: "AS", detail: `Thru ${through}`, closed: false, dormie: false, up };
    }
    return {
      headline: `${abs} up`,
      detail: "Dormie",
      closed: false,
      dormie: true,
      up,
    };
  }
  if (up === 0) {
    return { headline: "AS", detail: `Thru ${through}`, closed: false, dormie: false, up };
  }
  return {
    headline: `${abs} ${up > 0 ? "up" : "down"}`,
    detail: `Thru ${through}`,
    closed: false,
    dormie: false,
    up,
  };
}

export function summarizeStableford(pointsA: number, pointsB: number): { headline: string; detail: string } {
  return {
    headline: `${pointsA}–${pointsB}`,
    detail: "Stableford · unofficial",
  };
}

export function suggestedOfficialResult(
  up: number,
  reporterOnA: boolean,
  closed: boolean,
): "strong-mental" | "grass-roots" | "halved" | null {
  if (!closed && up !== 0) return null;
  if (up === 0) return "halved";
  const aAhead = reporterOnA ? up > 0 : up < 0;
  return aAhead ? "strong-mental" : "grass-roots";
}

export function formatPeerLine(name: string, status: string): string {
  const first = name.trim().split(/\s+/)[0] || name;
  return `${first} ${status} · unofficial`;
}

export function pairingKeyFor(matchId: string | null | undefined, day1Index?: number): string {
  if (matchId) return matchId;
  if (day1Index != null) return `day1:${day1Index}`;
  return "unscheduled";
}
