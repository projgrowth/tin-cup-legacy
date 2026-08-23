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
    chip: "most likely to three-putt",
  },
  {
    id: "pond",
    prompt: "Most likely to lose one in the pond",
    chip: "most likely to lose one in the pond",
  },
  {
    id: "putter",
    prompt: "Most likely to blame the putter",
    chip: "most likely to blame the putter",
  },
  {
    id: "gimme",
    prompt: "Most likely to ask for a gimme on 18",
    chip: "most likely to ask for a gimme",
  },
  {
    id: "round",
    prompt: "Most likely to buy the first round",
    chip: "most likely to buy the first round",
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
