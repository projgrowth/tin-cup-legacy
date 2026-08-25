import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CLAIM_CACHE_KEY,
  clearClaimedPlayerId,
  isMissingColumnError,
  readClaimedPlayerId,
  resolveIdentity,
  rosterName,
  writeClaimedPlayerId,
} from "./profile-identity";

describe("isMissingColumnError", () => {
  it("detects PostgREST and Postgres missing-column failures", () => {
    expect(isMissingColumnError({ code: "PGRST204", message: "schema cache" })).toBe(true);
    expect(isMissingColumnError({ code: "42703", message: "column does not exist" })).toBe(true);
    expect(isMissingColumnError({ message: "column profiles.status_text does not exist" })).toBe(
      true,
    );
    expect(isMissingColumnError({ code: "42501", message: "permission denied" })).toBe(false);
  });
});

describe("claim cache", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
    });
  });

  afterEach(() => {
    clearClaimedPlayerId();
    vi.unstubAllGlobals();
  });

  it("stores a player id per user and ignores other users", () => {
    writeClaimedPlayerId("u1", "p9");
    expect(readClaimedPlayerId("u1")).toBe("p9");
    expect(readClaimedPlayerId("u2")).toBeNull();
    writeClaimedPlayerId("u1", null);
    expect(readClaimedPlayerId("u1")).toBeNull();
    expect(store.get(CLAIM_CACHE_KEY)).toBeUndefined();
  });
});

describe("rosterName", () => {
  it("uses players.name and never a handle", () => {
    expect(
      rosterName({
        userId: "u1",
        players: [{ id: "p1", name: "Nick Sears" }],
        profiles: [{ id: "u1", player_id: "p1" }],
      }),
    ).toBe("Nick");
    expect(
      rosterName({
        userId: "u2",
        players: [{ id: "p1", name: "Nick Sears" }],
        profiles: [{ id: "u2", player_id: null }],
      }),
    ).toBe("Player");
  });
});

describe("resolveIdentity", () => {
  it("waits instead of sending a claimed player to the picker", () => {
    expect(
      resolveIdentity({
        signedIn: true,
        profilePending: true,
        profileError: false,
        playerId: null,
        tournamentPending: false,
        playerOnRoster: false,
      }).kind,
    ).toBe("loading");
    expect(
      resolveIdentity({
        signedIn: true,
        profilePending: false,
        profileError: false,
        playerId: "p1",
        tournamentPending: true,
        playerOnRoster: false,
      }).kind,
    ).toBe("loading");
  });

  it("shows hub when the roster has the claimed player", () => {
    expect(
      resolveIdentity({
        signedIn: true,
        profilePending: false,
        profileError: false,
        playerId: "p1",
        tournamentPending: false,
        playerOnRoster: true,
      }),
    ).toEqual({ kind: "hub", playerId: "p1", playerMissing: false });
  });

  it("does not use the claim form as an error sink", () => {
    expect(
      resolveIdentity({
        signedIn: true,
        profilePending: false,
        profileError: true,
        playerId: null,
        tournamentPending: false,
        playerOnRoster: false,
      }).kind,
    ).toBe("error");
    expect(
      resolveIdentity({
        signedIn: true,
        profilePending: false,
        profileError: false,
        playerId: "p1",
        tournamentPending: false,
        playerOnRoster: false,
      }),
    ).toEqual({ kind: "hub", playerId: "p1", playerMissing: true });
  });

  it("does not trap guests in a loading identity", () => {
    expect(
      resolveIdentity({
        signedIn: false,
        profilePending: true,
        profileError: false,
        playerId: null,
        tournamentPending: true,
        playerOnRoster: false,
      }).kind,
    ).toBe("claim");
  });

  it("only offers claim when the profile loaded with no player_id", () => {
    expect(
      resolveIdentity({
        signedIn: true,
        profilePending: false,
        profileError: false,
        playerId: null,
        tournamentPending: false,
        playerOnRoster: false,
      }).kind,
    ).toBe("claim");
  });
});
