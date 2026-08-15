import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function installStorage() {
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
  };
  vi.stubGlobal("window", { localStorage: storage });
}

describe("seat persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    installStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("remembers guest vs account until cleared", async () => {
    const { readSeat, writeSeat, clearSeat } = await import("@/lib/seat");
    expect(readSeat()).toBeNull();
    writeSeat("guest");
    expect(readSeat()).toBe("guest");
    writeSeat("account");
    expect(readSeat()).toBe("account");
    clearSeat();
    expect(readSeat()).toBeNull();
  });

  it("treats account routes as sign-in surfaces", async () => {
    const { isAuthPath } = await import("@/lib/seat");
    expect(isAuthPath("/profile")).toBe(true);
    expect(isAuthPath("/")).toBe(false);
    expect(isAuthPath("/scout")).toBe(false);
  });
});
