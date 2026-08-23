export const BANTER_HEADER = "The wall";
export const BANTER_SUBLINE = "Not official. Just the group chat.";

export const CUSTOM_PROMPT_MAX = 80;

export type BanterPrompt = {
  id: string;
  prompt: string;
  chip: string;
  authorId?: string;
  createdAt?: string;
  custom?: boolean;
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

export function resultForPrompt(
  votes: BanterVote[],
  promptId: string,
): { playerId: string; count: number; total: number; percent: number } | null {
  const win = winnerForPrompt(votes, promptId);
  const total = votesForPrompt(votes, promptId).length;
  if (!win || total === 0) return null;
  return {
    playerId: win.playerId,
    count: win.count,
    total,
    percent: Math.round((win.count / total) * 100),
  };
}

/** Prompt as a clause after "is gonna be the one to …" */
export function darePlain(prompt: BanterPrompt): string {
  if (prompt.id === "three-putt") return "3-putt";
  const stripped = prompt.prompt.replace(/^most likely to\s+/i, "").trim();
  return stripped || prompt.chip;
}

export function crowdSays(firstName: string, prompt: BanterPrompt, percent: number): string {
  return `${percent}% of people say ${firstName} is gonna be the one to ${darePlain(prompt)}`;
}

export function chipForPlayer(
  votes: BanterVote[],
  playerId: string,
  firstName: string,
  prompts: BanterPrompt[] = BANTER_PROMPTS,
): string[] {
  const lines: string[] = [];
  for (const prompt of prompts) {
    const result = resultForPrompt(votes, prompt.id);
    if (result?.playerId === playerId) lines.push(crowdSays(firstName, prompt, result.percent));
  }
  return lines;
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

export function chipFromBody(body: string): string {
  const t = body.trim().replace(/\s+/g, " ");
  if (!t) return "the room";
  return t.length <= 22 ? t : `${t.slice(0, 21)}…`;
}

export function normalizeCustomBody(body: string): string {
  return body.trim().replace(/\s+/g, " ").slice(0, CUSTOM_PROMPT_MAX);
}

export function mergeWallPrompts(custom: BanterPrompt[]): BanterPrompt[] {
  const extras = [...custom].sort((a, b) => {
    const at = Date.parse(b.createdAt ?? "") || 0;
    const bt = Date.parse(a.createdAt ?? "") || 0;
    return at - bt;
  });
  return [...BANTER_PROMPTS, ...extras];
}

export function promptFromList(prompts: BanterPrompt[], id: string): BanterPrompt | undefined {
  return prompts.find((row) => row.id === id);
}

export function upsertPrompt(prompts: BanterPrompt[], next: BanterPrompt): BanterPrompt[] {
  return [...prompts.filter((row) => row.id !== next.id), next];
}


/** Four faces for one most-likely: vote leaders, then a sensible subset. */
export function pollFaces<T extends { id: string }>(
  roster: T[],
  votes: BanterVote[],
  promptId: string,
  preferIds: string[] = [],
  limit = 4,
): T[] {
  const byId = new Map(roster.map((player) => [player.id, player]));
  const counts = new Map<string, number>();
  for (const vote of votesForPrompt(votes, promptId)) {
    counts.set(vote.playerId, (counts.get(vote.playerId) ?? 0) + 1);
  }
  const picked: T[] = [];
  const take = (id: string | undefined) => {
    if (!id) return;
    const player = byId.get(id);
    if (player && !picked.some((row) => row.id === id)) picked.push(player);
  };
  [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([id]) => take(id));
  preferIds.forEach((id) => take(id));
  roster.forEach((player, index) => {
    if (index % 4 === 0) take(player.id);
  });
  roster.forEach((player) => take(player.id));
  return picked.slice(0, limit);
}

/** Latest custom question, else the first canned prompt. */
export function activeWallPrompt(prompts: BanterPrompt[]): BanterPrompt | undefined {
  return [...prompts].reverse().find((row) => row.custom) ?? prompts[0];
}
