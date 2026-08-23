import { describe, expect, it } from "vitest";

import type { Match, Round } from "@/hooks/useTournament";
import {
  buildCardMoments,
  cardLine,
  cardMarkets,
  cardRecords,
  choiceHitsResult,
  faceoffCrowd,
  faceoffRiders,
  fridayCardMarkets,
  normalizeCardNote,
  pairingFirstNames,
  pendingMatchIds,
  peopleForMarket,
  isYourMarket,
  pickOnMarket,
  takeLabel,
  takenCount,
} from "./the-card";
import type { MatchPrediction } from "./social-platform";

const friday: Round = {
  id: "r-fri",
  slug: "friday",
  day_label: "Friday",
  play_date: "2026-08-28",
  course: "South",
  tee_window: "12:19 PM",
  format: "Scramble",
  format_detail: null,
  points: 8,
  meal: null,
  sort_order: 1,
};

const saturday: Round = {
  ...friday,
  id: "r-sat",
  slug: "saturday",
  day_label: "Saturday",
  play_date: "2026-08-29",
  course: "Copperhead",
  sort_order: 2,
};

function match(partial: Partial<Match> & Pick<Match, "id" | "label" | "side_a" | "side_b">): Match {
  return {
    round_id: friday.id,
    points: 1,
    result: "pending",
    sort_order: 1,
    revision: 0,
    updated_at: "2026-08-22T00:00:00Z",
    ...partial,
  };
}

describe("the card", () => {
  it("resolves full roster names for a Friday ticket", () => {
    const [ticket] = fridayCardMarkets([], [friday]);
    const people = peopleForMarket(ticket!, (name) =>
      name === "Zack Smith" ? { url: "/zack.jpg" } : undefined,
    );
    expect(people.peopleA.map((row) => row.name)).toEqual(["Zack Smith", "Chris Maher"]);
    expect(people.peopleA[0]?.src).toBe("/zack.jpg");
    expect(people.peopleB[0]?.teamSlug).toBe("grass-roots");
  });

  it("prints first names, never Side A", () => {
    expect(pairingFirstNames("Zack / Chris")).toBe("Zack · Chris");
    expect(takeLabel("side-a", "Zack / Chris", "Charles / Blake")).toBe("Zack · Chris");
    expect(takeLabel("side-b", "Zack / Chris", "Charles / Blake")).toBe("Charles · Blake");
    expect(takeLabel("halved", "Zack / Chris", "Charles / Blake")).toBe("a push");
  });

  it("counts unique riders on a faceoff, not duplicate format rows", () => {
    const crowd = faceoffCrowd(
      [
        {
          matchId: "s1",
          userId: "u1",
          choice: "side-a",
          createdAt: "",
          updatedAt: "2026-08-22T12:00:00Z",
        },
        {
          matchId: "a1",
          userId: "u1",
          choice: "side-a",
          createdAt: "",
          updatedAt: "2026-08-22T12:00:01Z",
        },
        {
          matchId: "s1",
          userId: "u2",
          choice: "side-b",
          createdAt: "",
          updatedAt: "2026-08-22T12:00:02Z",
        },
      ],
      ["s1", "a1"],
    );
    expect(crowd).toEqual({ sideA: 1, sideB: 1 });
  });

  it("lists rider user ids for crowd faces", () => {
    expect(
      faceoffRiders(
        [
          {
            matchId: "s1",
            userId: "u1",
            choice: "side-a",
            createdAt: "",
            updatedAt: "2026-08-22T12:00:00Z",
          },
        ],
        ["s1"],
      ).sideA,
    ).toEqual(["u1"]);
  });

  it("trims roast notes to 140", () => {
    expect(normalizeCardNote("  easy money  ")).toBe("easy money");
    expect(normalizeCardNote("   ")).toBeNull();
    expect(normalizeCardNote("x".repeat(200))?.length).toBe(140);
  });

  it("collapses Friday scramble + alt shot into four tickets", () => {
    const matches = [
      match({
        id: "s1",
        label: "Scramble Match 1",
        side_a: "Zack / Chris",
        side_b: "Charles / Blake",
        sort_order: 1,
      }),
      match({
        id: "a1",
        label: "Alt Shot Match 1",
        side_a: "Zack / Chris",
        side_b: "Charles / Blake",
        sort_order: 5,
      }),
      match({
        id: "s2",
        label: "Scramble Match 2",
        side_a: "Nick / Andrew",
        side_b: "Neil / Mike",
        sort_order: 2,
      }),
    ];
    const fridayMarkets = fridayCardMarkets(matches, [friday]);
    expect(fridayMarkets).toHaveLength(4);
    expect(fridayMarkets[0]?.matchIds).toEqual(["s1", "a1"]);
    expect(fridayMarkets[0]?.sideA).toBe("Zack / Chris");
    expect(fridayMarkets[1]?.matchIds).toEqual(["s2"]);
  });

  it("locks a ticket only when every grouped match has a result", () => {
    const matches = [
      match({
        id: "s1",
        label: "Scramble Match 1",
        side_a: "Zack / Chris",
        side_b: "Charles / Blake",
        result: "strong-mental",
      }),
      match({
        id: "a1",
        label: "Alt Shot Match 1",
        side_a: "Zack / Chris",
        side_b: "Charles / Blake",
        result: "pending",
        sort_order: 5,
      }),
    ];
    const [ticket] = fridayCardMarkets(matches, [friday]);
    expect(ticket?.locked).toBe(false);
    expect(pendingMatchIds(ticket!, matches)).toEqual(["a1"]);
  });

  it("adds Saturday matches as their own tickets", () => {
    const markets = cardMarkets(
      [
        match({
          id: "sat1",
          round_id: saturday.id,
          label: "Match 1",
          side_a: "Zack / Nick",
          side_b: "Charles / Neil",
        }),
      ],
      [friday, saturday],
    );
    expect(markets.some((market) => market.roundLabel === "Saturday")).toBe(true);
  });

  it("grades picks only after the official result", () => {
    expect(choiceHitsResult("side-a", "pending")).toBeNull();
    expect(choiceHitsResult("side-a", "strong-mental")).toBe(true);
    expect(choiceHitsResult("side-b", "strong-mental")).toBe(false);
    expect(choiceHitsResult("halved", "halved")).toBe(true);
  });

  it("writes a roast line without Side A copy", () => {
    expect(
      cardLine({
        author: "Dan",
        choice: "side-a",
        sideA: "Kevin / Max",
        sideB: "Dan / Josef",
        note: "Josef packed a compass.",
      }),
    ).toEqual({
      title: "Dan is with Kevin · Max",
      detail: "Josef packed a compass.",
    });
    expect(
      cardLine({
        author: "Dan",
        choice: "side-a",
        sideA: "Kevin / Max",
        sideB: "Dan / Josef",
        result: "grass-roots",
      }).detail,
    ).toBe("Ate it.");
  });

  it("counts a claimed player's card and ranks cashed picks", () => {
    const matches = [
      match({
        id: "s1",
        label: "Scramble Match 1",
        side_a: "Zack / Chris",
        side_b: "Charles / Blake",
        result: "strong-mental",
      }),
      match({
        id: "s2",
        label: "Scramble Match 2",
        side_a: "Nick / Andrew",
        side_b: "Neil / Mike",
      }),
    ];
    const predictions: MatchPrediction[] = [
      {
        matchId: "s1",
        userId: "u1",
        choice: "side-a",
        createdAt: "",
        updatedAt: "2026-08-22T12:00:00Z",
      },
      {
        matchId: "s2",
        userId: "u1",
        choice: "side-b",
        createdAt: "",
        updatedAt: "2026-08-22T12:01:00Z",
      },
    ];
    const markets = fridayCardMarkets(matches, [friday]);
    expect(takenCount(predictions, "u1", markets)).toEqual({ taken: 2, total: 4 });
    expect(isYourMarket(markets[0]!, "Zack Smith")).toBe(true);
    expect(isYourMarket(markets[1]!, "Zack Smith")).toBe(false);
    expect(takenCount(predictions, "u1", markets, "Zack Smith")).toEqual({ taken: 1, total: 3 });
    expect(pickOnMarket(predictions, "u1", ["s1"])?.choice).toBe("side-a");
    expect(cardRecords(predictions, matches)[0]).toMatchObject({
      userId: "u1",
      cashed: 1,
      pending: 1,
    });
  });

  it("turns takes into feed moments keyed per player per match", () => {
    const moments = buildCardMoments({
      matches: [
        match({
          id: "s1",
          label: "Scramble Match 1",
          side_a: "Kevin / Max",
          side_b: "Dan / Josef",
        }),
      ],
      predictions: [
        {
          matchId: "s1",
          userId: "u1",
          choice: "side-a",
          note: "easy money",
          createdAt: "2026-08-22T12:00:00Z",
          updatedAt: "2026-08-22T12:00:00Z",
        },
      ],
      authorName: () => "Dan",
    });
    expect(moments[0]).toMatchObject({
      key: "prediction:s1:u1",
      kind: "prediction",
      title: "Dan is with Kevin · Max",
      detail: "easy money",
      shareable: false,
    });
    expect(JSON.stringify(moments)).not.toMatch(/Side A/i);
  });

  it("dedupes scramble + alt shot takes into one feed line", () => {
    const moments = buildCardMoments({
      matches: [
        match({
          id: "s1",
          label: "Scramble Match 1",
          side_a: "Zack / Chris",
          side_b: "Charles / Blake",
        }),
        match({
          id: "a1",
          label: "Alt Shot Match 1",
          side_a: "Zack / Chris",
          side_b: "Charles / Blake",
          sort_order: 5,
        }),
      ],
      predictions: [
        {
          matchId: "s1",
          userId: "u1",
          choice: "side-a",
          createdAt: "2026-08-22T12:00:00Z",
          updatedAt: "2026-08-22T12:00:00Z",
        },
        {
          matchId: "a1",
          userId: "u1",
          choice: "side-a",
          createdAt: "2026-08-22T12:00:00Z",
          updatedAt: "2026-08-22T12:00:01Z",
        },
      ],
      authorName: () => "Dan",
    });
    expect(moments).toHaveLength(1);
  });
});
