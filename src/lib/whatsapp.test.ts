import { describe, expect, it } from "vitest";

import { boardShareText, whatsappShareUrl } from "@/lib/tin-cup";

describe("whatsapp helpers", () => {
  it("builds a shareable board message", () => {
    const text = boardShareText("8–6");
    expect(text).toContain("Tin Cup Invitational 2026");
    expect(text).toContain("Cup: 8–6");
    expect(text).toMatch(/tincupinv\.com|http/);
  });

  it("builds a WhatsApp compose URL", () => {
    const url = whatsappShareUrl("hello board");
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(url)).toContain("hello board");
  });
});
