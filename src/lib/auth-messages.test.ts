import { describe, expect, it } from "vitest";

import {
  isAlreadyRegistered,
  isInvalidLogin,
  isRateLimited,
  isUnconfirmedEmail,
} from "@/lib/auth-messages";

describe("auth-messages", () => {
  it("detects email rate limits", () => {
    expect(isRateLimited("email rate limit exceeded")).toBe(true);
    expect(isRateLimited("Too many requests")).toBe(true);
    expect(isRateLimited("Invalid login credentials")).toBe(false);
  });

  it("detects existing accounts", () => {
    expect(isAlreadyRegistered("User already registered")).toBe(true);
    expect(isAlreadyRegistered("A user with this email address has already been registered")).toBe(
      true,
    );
  });

  it("detects unconfirmed and bad password", () => {
    expect(isUnconfirmedEmail("Email not confirmed")).toBe(true);
    expect(isInvalidLogin("Invalid login credentials")).toBe(true);
  });
});
