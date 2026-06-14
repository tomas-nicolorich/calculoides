import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { transactionsHandler } from "../../../_src/handlers/transactions";
import { ExpenseService } from "../../../_src/services/expense";
import { RouteConfig } from "../../../_src/utils/dispatcher";
import { ApiRequest, ApiResponse } from "../../../_src/middleware/handler";

const mockedExpenseService = ExpenseService as unknown as Record<string, Mock>;

// Mock dependencies
vi.mock("../../../_src/services/expense", () => ({
  ExpenseService: {
    deleteExpense: vi.fn(),
  },
}));

vi.mock("../../../_src/utils/dispatcher", () => ({
  dispatch: vi.fn(
    (
      req: ApiRequest,
      res: ApiResponse,
      routes: RouteConfig,
      defaultAction: string,
    ) => {
      const action = (req.query.action as string) || defaultAction;
      const handler = routes[action];
      if (handler) return handler(req, res);
      res.status(404).json({ error: "Action not found" });
    },
  ),
}));

// Mock authentication middleware to pass through
vi.mock("../../../_src/middleware/handler", () => ({
  withAuth: <T>(handler: T): T => handler,
  withErrorHandling: <T>(handler: T): T => handler,
}));

describe("expense-delete handler", () => {
  let mockRequest: Partial<ApiRequest>;
  let mockResponse: Partial<ApiResponse>;

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
      headers: {},
    };

    await transactionsHandler(
      mockRequest as ApiRequest,
      mockResponse as ApiResponse,
    );

    expect(mockedExpenseService.deleteExpense).toHaveBeenCalledWith(uuid);
    expect(mockResponse.status).toHaveBeenCalledWith(204);
  });

  it("should extract id from params (rewritten path)", async () => {
    mockRequest = {
      query: { action: "expense-delete" },
      headers: {},
    };
    // Simulate params added by server/dispatcher
    (mockRequest as ApiRequest & { params?: Record<string, string> }).params = {
      id: uuid,
    };

    await transactionsHandler(
      mockRequest as ApiRequest,
      mockResponse as ApiResponse,
    );

    expect(mockedExpenseService.deleteExpense).toHaveBeenCalledWith(uuid);
    expect(mockResponse.status).toHaveBeenCalledWith(204);
  });

  it("should fail with invalid UUID", async () => {
    mockRequest = {
      query: { action: "expense-delete", id: "invalid-uuid" },
      headers: {},
    };

    // Since we mocked withErrorHandling to pass through, Zod error should throw
    await expect(
      transactionsHandler(
        mockRequest as ApiRequest,
        mockResponse as ApiResponse,
      ),
    ).rejects.toThrow();
  });
});
