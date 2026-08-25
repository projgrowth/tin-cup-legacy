import { describe, expect, it } from "vitest";

import {
  applyDay1ContestHoles,
  contestHoleLabel,
  contestHoleOpsDetail,
  contestHoleStatus,
  DAY1_CONTESTS,
  displaySidePots,
  knownContestsForHole,
  KNOWN_SIDE_POTS,
  potStatus,
} from "./contest-holes";

const friday = "friday-id";
const saturday = "saturday-id";
const rounds = [
  { id: friday, slug: "friday" },
  { id: saturday, slug: "saturday" },
];

describe("Day 1 contest holes", () => {
  it("fills Friday CTP 3 / 18 and long drive 13 without touching other days", () => {
    const bets = applyDay1ContestHoles(
      [
        { kind: "ctp", label: "CTP - Friday front", hole: null, round_id: friday },
        { kind: "ctp", label: "CTP - Friday back", hole: null, round_id: friday },
        { kind: "ld", label: "Long Drive - Friday", hole: null, round_id: friday },
        { kind: "ctp", label: "CTP - Saturday front", hole: null, round_id: saturday },
        { kind: "ld", label: "Long Drive - Saturday", hole: null, round_id: saturday },
      ],
      rounds,
    );
    expect(bets.map((bet) => bet.hole)).toEqual([
      DAY1_CONTESTS.ctpFront,
      DAY1_CONTESTS.ctpBack,
      DAY1_CONTESTS.longDrive,
      null,
      null,
    ]);
  });

  it("does not overwrite a hole already stored on the row", () => {
    const [bet] = applyDay1ContestHoles(
      [{ kind: "ctp", label: "CTP - Friday front", hole: 9, round_id: friday }],
      rounds,
    );
    expect(bet?.hole).toBe(9);
  });

  it("labels only confirmed hole numbers", () => {
    expect(contestHoleLabel(3)).toBe("Hole 3");
    expect(contestHoleLabel(null)).toBe("Hole TBD");
  });

  it("stamps Friday contests without a bet table", () => {
    expect(knownContestsForHole("south", 3)).toEqual(["ctp"]);
    expect(knownContestsForHole("south", 18)).toEqual(["ctp"]);
    expect(knownContestsForHole("south", 13)).toEqual(["ld"]);
    expect(knownContestsForHole("south", 1)).toEqual([]);
    expect(knownContestsForHole("copperhead", 16)).toEqual([]);
  });

  it("reports Friday posted while later days stay open", () => {
    const bets = applyDay1ContestHoles(
      [
        { kind: "ctp", label: "CTP - Friday front", hole: null, round_id: friday },
        { kind: "ctp", label: "CTP - Friday back", hole: null, round_id: friday },
        { kind: "ld", label: "Long Drive - Friday", hole: null, round_id: friday },
        { kind: "ctp", label: "CTP - Saturday front", hole: null, round_id: saturday },
        { kind: "ld", label: "Long Drive - Saturday", hole: null, round_id: saturday },
      ],
      rounds,
    );
    const status = contestHoleStatus(bets, rounds);
    expect(status).toEqual({ fridayPosted: true, remainingOpen: 2, allPosted: false });
    expect(contestHoleOpsDetail(status)).toContain("Saturday/Sunday TBD");
  });

  it("always shows eight pots, with Friday holes open", () => {
    expect(KNOWN_SIDE_POTS).toHaveLength(8);
    const empty = displaySidePots([]);
    expect(empty).toHaveLength(8);
    expect(potStatus(3)).toBe("Open · Hole 3");
    expect(potStatus(13)).toBe("Open · Hole 13");
    expect(potStatus(18)).toBe("Open · Hole 18");
    expect(potStatus(null)).toBe("Named Friday night");
    expect(
      displaySidePots([{ kind: "ctp", label: "CTP stavs", hole: 3, amount: 100 }])[0]?.label,
    ).toBe("CTP staves");
  });
});
