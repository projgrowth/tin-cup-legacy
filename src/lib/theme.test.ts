import { describe, expect, it } from "vitest";
import { THEME_BOOT, THEME_KEY } from "./theme";

describe("paper theme", () => {
  it("boots from localStorage or the system scheme before paint", () => {
    expect(THEME_KEY).toBe("tc-theme-v1");
    expect(THEME_BOOT).toContain("prefers-color-scheme: dark");
    expect(THEME_BOOT).toContain("dataset.theme=t");
  });

  it("keeps paper and night as distinct looks", () => {
    expect(THEME_BOOT).toContain('"paper"');
    expect(THEME_BOOT).toContain('"night"');
  });
});
