import { describe, expect, it } from "vitest";

import { isJunkBody, isJunkCaption, maskGuestProfanity } from "./locker-copy";

describe("locker copy", () => {
  it("masks guest-visible profanity and leaves signed-in copy raw", () => {
    expect(maskGuestProfanity("that shit is cooked", false)).toBe("that — is cooked");
    expect(maskGuestProfanity("You guys fuckin suck", false)).toBe("You guys — suck");
    expect(maskGuestProfanity("that shit is cooked", true)).toBe("that shit is cooked");
  });

  it("drops caption-test junk", () => {
    expect(isJunkCaption("caption test")).toBe(true);
    expect(isJunkCaption("Caption Test")).toBe(true);
    expect(isJunkCaption("easy money")).toBe(false);
    expect(isJunkBody("test")).toBe(true);
    expect(isJunkBody("Josef packed a compass.")).toBe(false);
  });
});
