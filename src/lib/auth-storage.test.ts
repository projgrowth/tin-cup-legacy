import { describe, expect, it } from "vitest";

import { compactAuthValue } from "./auth-storage";

describe("compactAuthValue", () => {
  it("keeps tokens and drops the user payload so cookies stay small", () => {
    const compact = JSON.parse(
      compactAuthValue(
        JSON.stringify({
          access_token: "aaa",
          refresh_token: "rrr",
          expires_at: 123,
          expires_in: 3600,
          token_type: "bearer",
          user: { id: "u1", email: "a@b.c", app_metadata: { a: 1 } },
        }),
      ),
    );
    expect(compact).toEqual({
      access_token: "aaa",
      refresh_token: "rrr",
      expires_at: 123,
      expires_in: 3600,
      token_type: "bearer",
    });
    expect(compact.user).toBeUndefined();
  });
});
