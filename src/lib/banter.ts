export const BANTER_HEADER = "The wall";
export const BANTER_SUBLINE = "Not official. Just the group chat.";

export type BanterPrompt = {
  id: string;
  prompt: string;
  chip: string;
};

/** Canned only — do not invent more at runtime. */
export const BANTER_PROMPTS: BanterPrompt[] = [
  {
    id: "three-putt",
    prompt: "Most likely to three-putt the first hole",
    chip: "3-putt 1",
  },
  {
    id: "sandbag",
    prompt: "Most likely to sandbag the first tee and then stripe one",
    chip: "sandbag",
  },
  {
    id: "breakfast",
    prompt: "Most likely to take a breakfast ball and still find the trees",
    chip: "breakfast ball",
  },
  {
    id: "parking",
    prompt: "Most likely to text on the way from the parking lot",
    chip: "still in the lot",
  },
  {
    id: "nassau",
    prompt: "Most likely to lose a Nassau and blame the putter",
    chip: "Nassau victim",
  },
  {
    id: "gimme",
    prompt: "Most likely to ask for a gimme from 8 feet",
    chip: "that's good right?",
  },
];

export type BanterVote = {
  promptId: string;
  voterId: string;
  playerId: string;
  updatedAt: string;
};

export function promptById(id: string): BanterPrompt | undefined {
  return BANTER_PROMPTS.find((row) => row.id === id);
}

export function votesForPrompt(votes: BanterVote[], promptId: string): BanterVote[] {
  return votes.filter((vote) => vote.promptId === promptId);
}

/** One winner per prompt — most taps, then newest vote. */
export function winnerForPrompt(
  votes: BanterVote[],
  promptId: string,
): { playerId: string; count: number } | null {
  const counts = new Map<string, { count: number; latest: number }>();
  for (const vote of votesForPrompt(votes, promptId)) {
    const prev = counts.get(vote.playerId) ?? { count: 0, latest: 0 };
    const at = Date.parse(vote.updatedAt) || 0;
    counts.set(vote.playerId, {
      count: prev.count + 1,
      latest: Math.max(prev.latest, at),
    });
  }
  let best: { playerId: string; count: number; latest: number } | null = null;
  for (const [playerId, row] of counts) {
    if (
      !best ||
      row.count > best.count ||
      (row.count === best.count && row.latest > best.latest)
    ) {
      best = { playerId, count: row.count, latest: row.latest };
    }
  }
  return best ? { playerId: best.playerId, count: best.count } : null;
}

export function chipForPlayer(
  votes: BanterVote[],
  playerId: string,
  firstName: string,
): string[] {
  const chips: string[] = [];
  for (const prompt of BANTER_PROMPTS) {
    const win = winnerForPrompt(votes, prompt.id);
    if (win?.playerId === playerId) chips.push(`${firstName} · ${prompt.chip}`);
  }
  return chips;
}

export function mineOnPrompt(
  votes: BanterVote[],
  promptId: string,
  voterId: string | undefined,
): BanterVote | undefined {
  if (!voterId) return undefined;
  return votes.find((vote) => vote.promptId === promptId && vote.voterId === voterId);
}

export function upsertVote(
  votes: BanterVote[],
  next: BanterVote,
): BanterVote[] {
  return [
    ...votes.filter((vote) => !(vote.promptId === next.promptId && vote.voterId === next.voterId)),
    next,
  ];
}
