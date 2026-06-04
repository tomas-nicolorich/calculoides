import { describe, it, expect, vi } from "vitest";
import { transactionsHandler } from "../../../src/handlers/transactions";

vi.mock("../../../src/utils/dispatcher");

describe("Transactions Handler Consolidation", () => {
  it("should exist", () => {
    expect(transactionsHandler).toBeDefined();
  });
});
