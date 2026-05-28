import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import transactionsHandler from "../../../src/handlers/transactions";
import { ExpenseService } from "../../../src/services/expense";
import { RouteConfig } from "../../../src/utils/dispatcher";

// Mock dependencies
vi.mock("../../../src/services/expense", () => ({
  ExpenseService: {
    deleteExpense: vi.fn(),
  },
}));

vi.mock("../../../src/utils/dispatcher", () => ({
  dispatch: vi.fn(
    (req: Request, res: Response, routes: RouteConfig, defaultAction: string) => {
      const action = (req.query.action as string) || defaultAction;
      const handler = routes[action];
      if (handler) return handler(req, res);
      res.status(404).json({ error: "Action not found" });
    },
  ),
}));

// Mock authentication middleware to pass through
vi.mock("../../../src/middleware/handler", () => ({
  withAuth: (handler: any) => handler,
  withErrorHandling: (handler: any) => handler,
}));

describe("expense-delete handler", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
    };
  });

  const uuid = "00000000-0000-0000-0000-000000000000";

  it("should extract id from query", async () => {
    mockRequest = {
      query: { action: "expense-delete", id: uuid },
      params: {},
    };

    await transactionsHandler(mockRequest as Request, mockResponse as Response);

    expect(ExpenseService.deleteExpense).toHaveBeenCalledWith(uuid);
    expect(mockResponse.status).toHaveBeenCalledWith(204);
  });

  it("should extract id from params (rewritten path)", async () => {
    mockRequest = {
      query: { action: "expense-delete" },
      params: { id: uuid },
    };

    await transactionsHandler(mockRequest as Request, mockResponse as Response);

    expect(ExpenseService.deleteExpense).toHaveBeenCalledWith(uuid);
    expect(mockResponse.status).toHaveBeenCalledWith(204);
  });

  it("should fail with invalid UUID", async () => {
    mockRequest = {
      query: { action: "expense-delete", id: "invalid-uuid" },
      params: {},
    };

    // Since we mocked withErrorHandling to pass through, Zod error should throw
    await expect(
      transactionsHandler(mockRequest as Request, mockResponse as Response)
    ).rejects.toThrow();
  });
});
