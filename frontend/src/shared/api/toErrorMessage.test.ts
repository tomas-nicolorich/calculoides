import { describe, it, expect } from "vitest";
import { toErrorMessage } from "./toErrorMessage";

describe("toErrorMessage", () => {
  it("passes null through as null", () => {
    expect(toErrorMessage(null)).toBeNull();
  });

  it("extracts the message from an Error instance", () => {
    expect(toErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("stringifies a non-Error value", () => {
    expect(toErrorMessage("plain string")).toBe("plain string");
    expect(toErrorMessage(404)).toBe("404");
  });
});
