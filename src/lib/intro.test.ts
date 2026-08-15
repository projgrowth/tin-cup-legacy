import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EVENT } from "@/lib/tin-cup";

const FIRST_TEE = new Date(EVENT.firstTee).getTime();
const ENDS = new Date(EVENT.endsAt).getTime();

function installWindowMocks(opts?: { reducedMotion?: boolean }) {
  const store = new Map<string, string>();
  const storage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  };

  vi.stubGlobal("window", {
    localStorage: storage,
    sessionStorage: storage,
    matchMedia: (query: string) => ({
      matches: Boolean(opts?.reducedMotion && query.includes("prefers-reduced-motion")),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

describe("intro persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    installWindowMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function loadIntro() {
    return import("@/lib/intro");
  }

  it("plays for a first-time pre-event visitor", async () => {
    const { shouldPlayIntro } = await loadIntro();
    expect(shouldPlayIntro(FIRST_TEE - 86_400_000)).toBe(true);
  });

  it("does not play after markIntroSeen (localStorage)", async () => {
    const {
      markIntroSeen,
      hasSeenCurrentIntro,
      shouldPlayIntro,
      INTRO_STORAGE_KEY,
      INTRO_VERSION,
    } = await loadIntro();
    markIntroSeen(FIRST_TEE - 1_000);
    expect(hasSeenCurrentIntro()).toBe(true);
    expect(shouldPlayIntro(FIRST_TEE - 1_000)).toBe(false);
    expect(JSON.parse(window.localStorage.getItem(INTRO_STORAGE_KEY)!).version).toBe(INTRO_VERSION);
  });

  it("never auto-plays during the live tournament phase", async () => {
    const { clearIntroSeen, shouldPlayIntro } = await loadIntro();
    clearIntroSeen();
    expect(shouldPlayIntro(FIRST_TEE + 60_000)).toBe(false);
    expect(shouldPlayIntro(ENDS - 60_000)).toBe(false);
  });

  it("does not play Friday morning of tournament weekend", async () => {
    const { clearIntroSeen, shouldPlayIntro } = await loadIntro();
    clearIntroSeen();
    expect(shouldPlayIntro(FIRST_TEE - 4 * 60 * 60 * 1000)).toBe(false);
  });

  it("can play again after the event for a brand-new visitor", async () => {
    const { clearIntroSeen, shouldPlayIntro } = await loadIntro();
    clearIntroSeen();
    expect(shouldPlayIntro(ENDS + 86_400_000)).toBe(true);
  });

  it("honors prefers-reduced-motion", async () => {
    installWindowMocks({ reducedMotion: true });
    const { clearIntroSeen, shouldPlayIntro } = await loadIntro();
    clearIntroSeen();
    expect(shouldPlayIntro(FIRST_TEE - 1_000)).toBe(false);
  });

  it("treats legacy sessionStorage flag as already seen", async () => {
    const { INTRO_SESSION_KEY, hasSeenCurrentIntro, shouldPlayIntro } = await loadIntro();
    window.sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    expect(hasSeenCurrentIntro()).toBe(true);
    expect(shouldPlayIntro(FIRST_TEE - 1_000)).toBe(false);
  });

  it("clearIntroSeen restores first-visit behavior before the event", async () => {
    const { markIntroSeen, clearIntroSeen, shouldPlayIntro } = await loadIntro();
    markIntroSeen();
    clearIntroSeen();
    expect(shouldPlayIntro(FIRST_TEE - 86_400_000)).toBe(true);
  });
});
