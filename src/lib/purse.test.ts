import { describe, expect, it } from "vitest";

import { formatPayout, groupBets, settlement, sideCash, sideCashByPlayer } from "@/lib/purse";

const bets = [
  { kind: "ctp", label: "CTP 1", amount: 100, player_name: "Zack Smith" },
  { kind: "ctp", label: "CTP 2", amount: 100, player_name: null },
  { kind: "ctp", label: "CTP 3", amount: 100, player_name: null },
  { kind: "ctp", label: "CTP 4", amount: 100, player_name: null },
  { kind: "ctp", label: "CTP 5", amount: 100, player_name: null },
  { kind: "ctp", label: "CTP 6", amount: 100, player_name: "Zack Smith" },
  { kind: "ld", label: "Long Drive 1", amount: 100, player_name: "Mike Maher" },
  // legacy UI kind should collapse with DB `ld`
  { kind: "long-drive", label: "Long Drive 2", amount: 100, player_name: null },
];

describe("groupBets", () => {
  it("collapses each kind into one line and normalizes ld aliases", () => {
    const groups = groupBets(bets);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      kind: "ctp",
      label: "Closest to the Pin",
      count: 6,
      amount: 100,
      total: 600,
      claimed: 2,
    });
    expect(groups[1]).toMatchObject({
      kind: "ld",
      label: "Long Drive",
      count: 2,
      amount: 100,
      total: 200,
    });
  });

  it("zeroes the unit amount when pot sizes differ", () => {
    const groups = groupBets([
      { kind: "ctp", label: "CTP 1", amount: 100, player_name: null },
      { kind: "ctp", label: "CTP 2", amount: 50, player_name: null },
    ]);
    expect(groups[0].amount).toBe(0);
    expect(groups[0].total).toBe(150);
  });
});

describe("sideCash", () => {
  it("reconciles Kevin $100 pots against the $800 side pool with zero slack", () => {
    const cash = sideCash(bets, 16);
    expect(cash.pool).toBe(800);
    expect(cash.posted).toBe(800);
    expect(cash.slack).toBe(0);
    expect(cash.claimedTotal).toBe(300);
    expect(cash.openTotal).toBe(500);
  });

  it("handles an empty board", () => {
    expect(sideCash([], 16)).toMatchObject({ pool: 800, posted: 0, slack: 800, openTotal: 0 });
  });

  it("tracks unconfigured payouts as TBD and shows confirmed amounts", () => {
    const cash = sideCash(
      [{ kind: "ctp", label: "South CTP 1", amount: 0, player_name: null }],
      16,
    );
    expect(cash.unconfigured).toBe(1);
    expect(formatPayout(0)).toBe("TBD");
    // Kevin admin amounts
    expect(formatPayout(100)).toBe("$100");
  });
});

describe("settlement", () => {
  it("stays undecided while the Cup is live", () => {
    const result = settlement([
      { id: "1", round_id: "r", points: 8, result: "strong-mental" },
      { id: "2", round_id: "r", points: 18, result: "pending" },
    ]);
    expect(result.decided).toBe(false);
    expect(result.winner).toBeNull();
  });

  it("names the winner once 13.5 is reached", () => {
    const result = settlement([
      { id: "1", round_id: "r", points: 14, result: "grass-roots" },
      { id: "2", round_id: "r", points: 12, result: "pending" },
    ]);
    expect(result).toMatchObject({
      winner: "grass-roots",
      decided: true,
      winnerPayout: 200,
      loserPayout: -100,
    });
  });
});

describe("sideCashByPlayer", () => {
  it("totals per player, biggest first", () => {
    expect(sideCashByPlayer(bets)).toEqual([
      { name: "Zack Smith", total: 200 },
      { name: "Mike Maher", total: 100 },
    ]);
  });
});
