import { describe, it, expect, vi } from "vitest";
import { transactionsHandler } from "../../../_src/handlers/transactions";

vi.mock("../../../_src/utils/dispatcher");

describe("Transactions Handler Consolidation", () => {
  it("should exist", () => {
    expect(transactionsHandler).toBeDefined();
  });
});
