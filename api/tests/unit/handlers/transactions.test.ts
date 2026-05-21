import { describe, it, expect, vi } from "vitest";
import { Request, Response } from "express";
import transactionsHandler from "../../../src/handlers/transactions";
import { RouteConfig } from "../../../src/utils/dispatcher";

vi.mock("../../../src/utils/dispatcher", () => ({
  dispatch: vi.fn(
    (_req: Request, res: Response, routes: RouteConfig, action: string) => {
      const handler = routes[action];
      if (handler) return handler(_req, res);
      res.status(404).json({ error: "Action not found" });
    },
  ),
}));

describe("Transactions Handler Consolidation", () => {
  it("should exist", () => {
    expect(transactionsHandler).toBeDefined();
  });
});
