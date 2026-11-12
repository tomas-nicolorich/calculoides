import { describe, it, expect, vi } from "vitest";
import { throwOnFailure } from "./throw-on-failure";
import { ok, fail } from "../../lib/actions/result";

describe("throwOnFailure", () => {
  it("returns the result of a successful action", async () => {
    const action = vi.fn().mockResolvedValue(ok({ id: "1" }));

    await expect(throwOnFailure(action)({ a: 1 })).resolves.toEqual(
      ok({ id: "1" }),
    );
    expect(action).toHaveBeenCalledWith({ a: 1 });
  });

  it("throws the action's error message when the action fails", async () => {
    const action = vi
      .fn()
      .mockResolvedValue(fail("Not a member of this group", 403));

    await expect(throwOnFailure(action)({})).rejects.toThrow(
      "Not a member of this group",
    );
  });
});
