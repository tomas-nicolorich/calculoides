import { describe, it, expect } from "vitest";
import { cn } from "./cn";

/**
 * PR 2 foundations (ADR-1): `cn` = `twMerge(clsx(inputs))`, the shared
 * class-merge helper every `app/_ui/**` primitive built from PR 3 onward
 * will depend on.
 */
describe("cn", () => {
  it("keeps truthy class values and drops falsy ones", () => {
    const includeB = false as boolean;
    expect(cn("a", includeB && "b", "c")).toBe("a c");
  });

  it("resolves conflicting Tailwind classes with tailwind-merge precedence (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
