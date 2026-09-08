import { describe, it, expect } from "vitest";
import { resolveProfileDisplay } from "./page";

describe("resolveProfileDisplay", () => {
  it("uses the trimmed profile name when one is set", () => {
    const result = resolveProfileDisplay(
      { email: "alice@example.com" },
      { name: "  Alice  ", email: "alice@example.com" },
    );

    expect(result).toEqual({
      email: "alice@example.com",
      usedFallbackName: false,
      displayName: "Alice",
    });
  });

  it("falls back to the email when the profile has no name", () => {
    const result = resolveProfileDisplay(
      { email: "alice@example.com" },
      { name: null, email: "alice@example.com" },
    );

    expect(result).toEqual({
      email: "alice@example.com",
      usedFallbackName: true,
      displayName: "alice@example.com",
    });
  });

  it("falls back to the email when the profile name is blank", () => {
    const result = resolveProfileDisplay(
      { email: "alice@example.com" },
      { name: "   ", email: "alice@example.com" },
    );

    expect(result).toEqual({
      email: "alice@example.com",
      usedFallbackName: true,
      displayName: "alice@example.com",
    });
  });

  it("falls back to the profile's email when the auth user has none", () => {
    const result = resolveProfileDisplay(
      { email: undefined },
      { name: null, email: "alice@example.com" },
    );

    expect(result.email).toBe("alice@example.com");
  });

  it("resolves to an empty email when neither source has one", () => {
    const result = resolveProfileDisplay({ email: undefined }, null);

    expect(result).toEqual({
      email: "",
      usedFallbackName: true,
      displayName: "",
    });
  });
});
