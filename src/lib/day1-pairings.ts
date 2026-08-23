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
