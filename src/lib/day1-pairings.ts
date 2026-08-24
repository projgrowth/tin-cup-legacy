/**
 * Friday (Day 1) locked pairings — South Course scramble + alt-shot.
 * Same foursomes play both formats. Sat/Sun pairings announced night before.
 *
 * side_a = Strong Mental, side_b = Grass Roots (matches result enum).
 */
export type Day1Pairing = {
  matchIndex: number;
  sideA: string;
  sideB: string;
  playersA: [string, string];
  playersB: [string, string];
};

export const DAY1_PAIRINGS: Day1Pairing[] = [
  {
    matchIndex: 1,
    sideA: "Zack / Chris",
    sideB: "Charles / Blake",
    playersA: ["Zack Smith", "Chris Maher"],
    playersB: ["Charles Grass", "Blake Weeks"],
  },
  {
    matchIndex: 2,
    sideA: "Nick / Andrew",
    sideB: "Neil / Mike",
    playersA: ["Nick Sears", "Andrew Kezsbom"],
    playersB: ["Neil Candelora", "Mike Maher"],
  },
  {
    matchIndex: 3,
    sideA: "Kevin / Max",
    sideB: "Dan / Josef",
    playersA: ["Kevin Maher", "Max Furth"],
    playersB: ["Dan Rodriguez", "Josef Yehia"],
  },
  {
    matchIndex: 4,
    sideA: "Seth / Keenan",
    sideB: "Casey / Barry",
    playersA: ["Seth Beaver", "Keenan Horrell"],
    playersB: ["Casey Gillespie", "Barry Rigby"],
  },
];

export const FIELD_SIDES = [
  {
    slug: "strong-mental" as const,
    name: "Team Strong Mental",
    captain: "Zack Smith",
    players: DAY1_PAIRINGS.flatMap((p) => p.playersA),
  },
  {
    slug: "grass-roots" as const,
    name: "Team Grass Roots",
    captain: "Charles Grass",
    players: DAY1_PAIRINGS.flatMap((p) => p.playersB),
  },
];

export const DAY1_META = {
  day: "Friday",
  course: "South Course",
  tee: "12:19 PM",
  formats: "Scramble · Modified Alt Shot",
  note: "Saturday & Sunday pairings announced the night before each round.",
} as const;

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Find which Day 1 group a player is in (for rosters). */
export function day1GroupForPlayer(playerName: string): {
  side: "a" | "b";
  pairing: Day1Pairing;
  partner: string;
  opponents: string;
} | null {
  const n = playerName.trim().toLowerCase();
  for (const p of DAY1_PAIRINGS) {
    for (const name of p.playersA) {
      if (name.toLowerCase() === n) {
        return {
          side: "a",
          pairing: p,
          partner: p.playersA.find((x) => x !== name)!,
          opponents: p.sideB,
        };
      }
    }
    for (const name of p.playersB) {
      if (name.toLowerCase() === n) {
        return {
          side: "b",
          pairing: p,
          partner: p.playersB.find((x) => x !== name)!,
          opponents: p.sideA,
        };
      }
    }
  }
  return null;
}

/** Pairing line. Claimed seat reads You · partner vs them. */
export function groupLine(playerName: string, asYou = false): string | null {
  const group = day1GroupForPlayer(playerName);
  if (!group) return null;
  const them = group.opponents
    .split(/[/,&+]|\band\b/i)
    .map((part) => firstName(part.trim()))
    .filter(Boolean)
    .join(" · ");
  const lead = asYou ? "You" : firstName(playerName);
  return `${lead} · ${firstName(group.partner)} vs ${them}`;
}

export function yourGroupLine(playerName: string): string | null {
  return groupLine(playerName, true);
}

/** Spoken Home sentence: You and Kevin vs Mike and Tom. */
export function foursomeSentence(
  playersA: string[],
  playersB: string[],
  claimedName?: string | null,
): string {
  const n = claimedName?.trim().toLowerCase() ?? "";
  const onA = Boolean(n && playersA.some((name) => name.trim().toLowerCase() === n));
  const onB = Boolean(n && playersB.some((name) => name.trim().toLowerCase() === n));
  const left = onB ? playersB : playersA;
  const right = onB ? playersA : playersB;
  const you = onA || onB;
  const lead = you ? left.find((name) => name.trim().toLowerCase() === n) ?? left[0]! : left[0]!;
  const partner = left.find((name) => name !== lead) ?? left[1]!;
  const leftLead = you ? "You" : firstName(lead);
  return `${leftLead} and ${firstName(partner)} vs ${firstName(right[0]!)} and ${firstName(right[1]!)}`;
}

/** Roster subtitle: Friday partner vs them. */
export function fridayPartnerLine(playerName: string): string | null {
  const group = day1GroupForPlayer(playerName);
  if (!group) return null;
  const them = group.opponents
    .split(/[/,&+]|\band\b/i)
    .map((part) => firstName(part.trim()))
    .filter(Boolean)
    .join(" · ");
  return `${firstName(group.partner)} · vs ${them}`;
}

export type FoursomeSeat = {
  name: string;
  you: boolean;
  teamSlug: "strong-mental" | "grass-roots";
};

/** You, partner, then the two across. */
export function fridayFoursome(playerName: string): FoursomeSeat[] | null {
  const group = day1GroupForPlayer(playerName);
  if (!group) return null;
  const yours = group.side === "a" ? group.pairing.playersA : group.pairing.playersB;
  const across = group.side === "a" ? group.pairing.playersB : group.pairing.playersA;
  const you = yours.find((name) => name.toLowerCase() === playerName.trim().toLowerCase()) ?? yours[0]!;
  const partner = yours.find((name) => name !== you) ?? yours[1]!;
  return [
    { name: you, you: true, teamSlug: group.side === "a" ? "strong-mental" : "grass-roots" },
    { name: partner, you: false, teamSlug: group.side === "a" ? "strong-mental" : "grass-roots" },
    { name: across[0]!, you: false, teamSlug: group.side === "a" ? "grass-roots" : "strong-mental" },
    { name: across[1]!, you: false, teamSlug: group.side === "a" ? "grass-roots" : "strong-mental" },
  ];
}

export function fridayRosterNames(): string[] {
  return DAY1_PAIRINGS.flatMap((row) => [...row.playersA, ...row.playersB]);
}
