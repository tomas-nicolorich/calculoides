import { describe, it, expect, vi } from "vitest";
import { transactionsHandler } from "../../../src/handlers/transactions";
import { RouteConfig } from "../../../src/utils/dispatcher";
import { ApiRequest, ApiResponse } from "../../../src/middleware/handler";

vi.mock("../../../src/utils/dispatcher", () => ({
  dispatch: vi.fn(
    (
      req: ApiRequest,
      res: ApiResponse,
      routes: RouteConfig,
      action: string,
    ) => {
      const handler = routes[action];
      if (handler) return handler(req, res);
      res.status(404).json({ error: "Action not found" });
    },
  ),
}));

describe("Transactions Handler Consolidation", () => {
  it("should exist", () => {
    expect(transactionsHandler).toBeDefined();
  });
});
