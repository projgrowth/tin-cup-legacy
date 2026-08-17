import { describe, expect, it } from "vitest";

import {
  hasAuthCallbackParams,
  isRecoveryCallback,
  parseAuthCallbackParams,
} from "@/lib/auth-recovery";

describe("parseAuthCallbackParams", () => {
  it("reads recovery token_hash from search", () => {
    const params = parseAuthCallbackParams(
      "https://tincupinv.com/profile?token_hash=abc123&type=recovery",
    );
    expect(params).toEqual({ tokenHash: "abc123", type: "recovery" });
    expect(isRecoveryCallback(params)).toBe(true);
  });

  it("reads PKCE code from search", () => {
    const params = parseAuthCallbackParams("https://tincupinv.com/?code=pkce-code");
    expect(params.code).toBe("pkce-code");
    expect(isRecoveryCallback(params)).toBe(false);
    expect(hasAuthCallbackParams(params)).toBe(true);
  });

  it("reads implicit recovery from hash", () => {
    const params = parseAuthCallbackParams(
      "https://tincupinv.com/#access_token=tok&type=recovery&refresh_token=r",
    );
    expect(params.type).toBe("recovery");
    expect(params.tokenHash).toBeUndefined();
    expect(isRecoveryCallback(params)).toBe(true);
    expect(hasAuthCallbackParams(params)).toBe(true);
  });

  it("prefers search over hash when both exist", () => {
    const params = parseAuthCallbackParams(
      "https://tincupinv.com/profile?type=recovery&token_hash=from-search#type=signup&token_hash=from-hash",
    );
    expect(params.type).toBe("recovery");
    expect(params.tokenHash).toBe("from-search");
  });

  it("ignores empty and invalid URLs", () => {
    expect(parseAuthCallbackParams("not a url")).toEqual({});
    expect(parseAuthCallbackParams("https://tincupinv.com/profile")).toEqual({});
    expect(isRecoveryCallback({})).toBe(false);
    expect(hasAuthCallbackParams({})).toBe(false);
  });

  it("does not treat magic-link type as recovery without token_hash", () => {
    const params = parseAuthCallbackParams("https://tincupinv.com/profile?type=magiclink&code=x");
    expect(isRecoveryCallback(params)).toBe(false);
    expect(hasAuthCallbackParams(params)).toBe(true);
  });
});
